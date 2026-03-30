/**
 * Bayesian Knowledge Tracing (BKT)
 *
 * Models knowledge as a probability P(know) per sub-axis per user.
 * Accounts for:
 *   - p_slip: probability of wrong answer despite knowing
 *   - p_guess: probability of right answer despite not knowing
 *   - p_learn: probability of learning from a practice event
 */

import { prisma } from "./prisma";
import { getWeaknessMap, saveWeaknessSnapshot } from "./weakness-map";
import type { WeaknessScores } from "./weakness-map";

interface BKTParams {
  pKnow: number;   // prior probability of knowing (0–1)
  pLearn: number;  // probability of learning from wrong
  pSlip: number;   // probability of wrong despite knowing
  pGuess: number;  // probability of right despite not knowing
}

const DEFAULT_BKT_PARAMS: BKTParams = {
  pKnow: 0.3,
  pLearn: 0.15,
  pSlip: 0.1,
  pGuess: 0.2,
};

const SUB_AXIS_PARAMS: Record<string, BKTParams> = {
  "grammar.deHet":             { pKnow: 0.3, pLearn: 0.1, pSlip: 0.15, pGuess: 0.5 },
  "grammar.separableVerbs":    { pKnow: 0.2, pLearn: 0.12, pSlip: 0.1, pGuess: 0.2 },
  "grammar.v2WordOrder":       { pKnow: 0.35, pLearn: 0.15, pSlip: 0.1, pGuess: 0.25 },
  "grammar.subordinateClauses":{ pKnow: 0.25, pLearn: 0.12, pSlip: 0.1, pGuess: 0.2 },
  "grammar.verbConjugation":   { pKnow: 0.3, pLearn: 0.15, pSlip: 0.1, pGuess: 0.3 },
  "grammar.tenseUsage":        { pKnow: 0.3, pLearn: 0.12, pSlip: 0.1, pGuess: 0.25 },
};

function getParams(subAxis: string): BKTParams {
  return SUB_AXIS_PARAMS[subAxis] ?? DEFAULT_BKT_PARAMS;
}

/**
 * Bayes update: given prior P(know) and observed correctness,
 * return posterior P(know).
 */
function bayesUpdate(prior: number, correct: boolean, params: BKTParams): number {
  const { pSlip, pGuess, pLearn } = params;

  const pCorrectGivenKnow = 1 - pSlip;
  const pCorrectGivenNotKnow = pGuess;

  const pObserved = correct
    ? prior * pCorrectGivenKnow + (1 - prior) * pCorrectGivenNotKnow
    : prior * pSlip + (1 - prior) * (1 - pGuess);

  if (pObserved === 0) return prior;

  const pKnowGivenObs = correct
    ? (prior * pCorrectGivenKnow) / pObserved
    : (prior * pSlip) / pObserved;

  // Apply learning transition
  return pKnowGivenObs + (1 - pKnowGivenObs) * pLearn;
}

export interface UpdateSubAxisInput {
  correct: boolean;
  responseTimeMs: number;
  confidenceLevel?: "sure" | "unsure" | "guessing";
}

/** Careless detection: fast wrong answer by someone who usually gets it right */
function detectCareless(
  input: UpdateSubAxisInput,
  currentScore: number
): boolean {
  return (
    !input.correct &&
    input.responseTimeMs < 1500 &&
    currentScore > 60
  );
}

/**
 * Update a weakness map sub-axis using BKT.
 * Persists changes and returns updated score (0–100).
 */
export async function updateSubAxis(
  userId: string,
  subAxis: string,
  input: UpdateSubAxisInput
): Promise<number> {
  const scores = await getWeaknessMap(userId);
  const currentRaw = getSubAxisScore(scores, subAxis);
  const prior = currentRaw / 100;

  const isCareless = detectCareless(input, currentRaw);
  const effectiveCorrect = isCareless ? false : input.correct;

  const params = getParams(subAxis);
  const posterior = bayesUpdate(prior, effectiveCorrect, params);

  // Confidence adjustment: overconfident wrong = extra penalty
  let adjusted = posterior;
  if (!input.correct && input.confidenceLevel === "sure") {
    adjusted = Math.max(0, posterior - 0.05);
  }
  // Underconfident right = small boost
  if (input.correct && input.confidenceLevel === "guessing") {
    adjusted = Math.min(1, posterior + 0.02);
  }

  const newScore = Math.round(adjusted * 100);

  // Write updated scores back to the weakness map
  const newScores = setSubAxisScore(scores, subAxis, newScore);
  await prisma.weaknessMap.update({
    where: { userId },
    data: { scores: newScores as object },
  });

  return newScore;
}

/** Read a sub-axis score from the scores object by dot-path */
function getSubAxisScore(scores: WeaknessScores, path: string): number {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = scores;
  for (const p of parts) {
    if (cur == null) return 50;
    cur = cur[p];
  }
  return typeof cur === "number" ? cur : 50;
}

/** Return a new scores object with the given path updated */
function setSubAxisScore(
  scores: WeaknessScores,
  path: string,
  value: number
): WeaknessScores {
  const clone = JSON.parse(JSON.stringify(scores)) as WeaknessScores;
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = clone;
  for (let i = 0; i < parts.length - 1; i++) {
    cur = cur[parts[i]!];
  }
  cur[parts[parts.length - 1]!] = value;
  return clone;
}

/** Record a mistake and update BKT */
export async function recordMistakeAndUpdate(opts: {
  userId: string;
  sessionId: string;
  subAxis: string;
  category: string;
  rootCause: "INTERFERENCE" | "UNKNOWN" | "CONFUSION" | "CARELESS";
  original: string;
  correction: string;
  explanation?: string;
  responseTimeMs?: number;
}) {
  const [newScore] = await Promise.all([
    updateSubAxis(opts.userId, opts.subAxis, {
      correct: false,
      responseTimeMs: opts.responseTimeMs ?? 3000,
    }),
    prisma.mistake.create({
      data: {
        userId: opts.userId,
        sessionId: opts.sessionId,
        subAxis: opts.subAxis,
        category: opts.category,
        rootCause: opts.rootCause,
        original: opts.original,
        correction: opts.correction,
        explanation: opts.explanation,
        responseTimeMs: opts.responseTimeMs,
      },
    }),
  ]);

  // Check pattern alert
  await checkPatternAlert(opts.userId, opts.sessionId, opts.subAxis);

  return newScore;
}

/** Fire a pattern alert if ≥3 same-category mistakes in this session */
export async function checkPatternAlert(
  userId: string,
  sessionId: string,
  subAxis: string
): Promise<boolean> {
  const count = await prisma.mistake.count({
    where: { userId, sessionId, subAxis, resolved: false },
  });

  if (count >= 3) {
    const existing = await prisma.patternAlert.findFirst({
      where: { userId, sessionId, subAxis, resolved: false },
    });
    if (!existing) {
      await prisma.patternAlert.create({
        data: {
          userId,
          sessionId,
          subAxis,
          count,
          miniLesson: generateMiniLesson(subAxis),
          resolved: false,
        },
      });
      return true;
    }
  }
  return false;
}

function generateMiniLesson(subAxis: string): object {
  const lessons: Record<string, object> = {
    "grammar.deHet": {
      title: "De vs Het — Quick Guide",
      explanation:
        "Dutch has two articles: 'de' (common gender) and 'het' (neuter). About 75% of nouns use 'de'. Diminutives (-tje) always use 'het'. Nouns ending in -heid, -ing, -schap, -tie always use 'de'.",
      tips: [
        "Learn articles with every new noun",
        "Diminutives (huis → huisje) are ALWAYS het",
        "-heid, -ing, -schap endings are ALWAYS de",
      ],
    },
    "grammar.separableVerbs": {
      title: "Separable Verbs — Quick Guide",
      explanation:
        "Separable verbs split in main clauses: 'opbellen' → 'Ik bel je op'. They stay together in subordinate clauses: 'Ik weet dat hij je opbelt'.",
      tips: [
        "In main clause: prefix goes to end",
        "In subordinate clause: verb stays together",
        "In perfect tense: ge- goes between prefix and stem",
      ],
    },
    "grammar.v2WordOrder": {
      title: "V2 Word Order — Quick Guide",
      explanation:
        "In Dutch main clauses, the verb is ALWAYS second. When anything other than the subject starts the sentence, subject and verb swap: 'Morgen ga ik naar huis'.",
      tips: [
        "Count elements: subject + verb or element + verb + subject",
        "Time/place/manner adverbials trigger inversion",
        "Questions: verb comes first",
      ],
    },
    "grammar.subordinateClauses": {
      title: "Subordinate Clause Word Order",
      explanation:
        "In subordinate clauses (dat, omdat, als, wanneer...), the verb moves to the END: 'Ik weet dat hij morgen thuis is'.",
      tips: [
        "Connectors: dat, omdat, als, wanneer, terwijl, hoewel",
        "All verbs cluster at end in subordinate clause",
        "Separable verbs rejoin in subordinate clauses",
      ],
    },
  };
  return (
    lessons[subAxis] ?? {
      title: `Practice: ${subAxis}`,
      explanation: "Focus on this area to improve your Dutch.",
      tips: ["Review the rule", "Practice with examples", "Use in context"],
    }
  );
}

export async function endSession(
  userId: string,
  sessionId: string
): Promise<void> {
  await prisma.learningSession.update({
    where: { id: sessionId },
    data: { completed: true, updatedAt: new Date() },
  });
  await saveWeaknessSnapshot(userId, sessionId);
  await updateStreak(userId);
}

async function updateStreak(userId: string): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.streak.findUnique({ where: { userId } });

  if (!streak) {
    await prisma.streak.create({
      data: {
        userId,
        currentStreak: 1,
        longestStreak: 1,
        lastActiveDate: today,
        totalXp: 10,
      },
    });
    return;
  }

  const lastDate = streak.lastActiveDate
    ? new Date(streak.lastActiveDate)
    : null;
  if (lastDate) lastDate.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let newCurrent = streak.currentStreak;
  if (!lastDate || lastDate.getTime() < yesterday.getTime()) {
    newCurrent = 1; // streak broken
  } else if (lastDate.getTime() === yesterday.getTime()) {
    newCurrent = streak.currentStreak + 1; // consecutive
  }

  const newLongest = Math.max(newCurrent, streak.longestStreak);

  await prisma.streak.update({
    where: { userId },
    data: {
      currentStreak: newCurrent,
      longestStreak: newLongest,
      lastActiveDate: today,
      totalXp: streak.totalXp + 10,
    },
  });
}
