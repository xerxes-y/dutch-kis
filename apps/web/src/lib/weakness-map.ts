import { prisma } from "./prisma";

export interface WeaknessScores {
  vocabulary: {
    work: number;
    family: number;
    travel: number;
    academic: number;
    daily: number;
  };
  grammar: {
    deHet: number;
    separableVerbs: number;
    v2WordOrder: number;
    subordinateClauses: number;
    verbConjugation: number;
    tenseUsage: number;
  };
  pronunciation: {
    gSchSounds: number;
    uiIjDiphthongs: number;
    longVowels: number;
    wordStress: number;
  };
  listening: number;
  writing: {
    formalRegister: number;
    informalRegister: number;
    emailStructure: number;
  };
  register: {
    formalU: number;
    informalJij: number;
    idioms: number;
  };
}

/** Native language pre-weights (0–100 initial BKT probability × 100) */
const NATIVE_LANGUAGE_WEIGHTS: Record<string, Partial<Record<string, number>>> = {
  en: {
    "grammar.deHet": 15,
    "grammar.separableVerbs": 10,
    "pronunciation.gSchSounds": 20,
    "pronunciation.uiIjDiphthongs": 15,
  },
  de: {
    "vocabulary.daily": 55,
    "pronunciation.gSchSounds": 50,
    "grammar.deHet": 40,
    "grammar.separableVerbs": 45,
  },
  tr: {
    "grammar.v2WordOrder": 5,
    "grammar.subordinateClauses": 5,
    "grammar.deHet": 5,
    "grammar.verbConjugation": 20,
  },
  ar: {
    "grammar.v2WordOrder": 5,
    "grammar.subordinateClauses": 10,
    "grammar.verbConjugation": 15,
  },
  fr: {
    "pronunciation.gSchSounds": 20,
    "pronunciation.uiIjDiphthongs": 20,
    "grammar.v2WordOrder": 35,
  },
  es: {
    "pronunciation.gSchSounds": 20,
    "pronunciation.uiIjDiphthongs": 20,
    "grammar.v2WordOrder": 35,
  },
};

export function defaultScores(nativeLanguage?: string | null): WeaknessScores {
  const weights = nativeLanguage
    ? (NATIVE_LANGUAGE_WEIGHTS[nativeLanguage] ?? {})
    : {};

  function w(key: string, base = 50): number {
    return weights[key] ?? base;
  }

  return {
    vocabulary: {
      work: w("vocabulary.work"),
      family: w("vocabulary.family"),
      travel: w("vocabulary.travel"),
      academic: w("vocabulary.academic"),
      daily: w("vocabulary.daily"),
    },
    grammar: {
      deHet: w("grammar.deHet"),
      separableVerbs: w("grammar.separableVerbs"),
      v2WordOrder: w("grammar.v2WordOrder"),
      subordinateClauses: w("grammar.subordinateClauses"),
      verbConjugation: w("grammar.verbConjugation"),
      tenseUsage: w("grammar.tenseUsage"),
    },
    pronunciation: {
      gSchSounds: w("pronunciation.gSchSounds"),
      uiIjDiphthongs: w("pronunciation.uiIjDiphthongs"),
      longVowels: w("pronunciation.longVowels"),
      wordStress: w("pronunciation.wordStress"),
    },
    listening: w("listening"),
    writing: {
      formalRegister: w("writing.formalRegister"),
      informalRegister: w("writing.informalRegister"),
      emailStructure: w("writing.emailStructure"),
    },
    register: {
      formalU: w("register.formalU"),
      informalJij: w("register.informalJij"),
      idioms: w("register.idioms"),
    },
  };
}

export async function getWeaknessMap(userId: string): Promise<WeaknessScores> {
  const map = await prisma.weaknessMap.findUnique({ where: { userId } });
  if (!map) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    return defaultScores(user?.nativeLanguage);
  }
  return map.scores as WeaknessScores;
}

export async function initWeaknessMap(
  userId: string,
  nativeLanguage?: string | null
): Promise<WeaknessScores> {
  const scores = defaultScores(nativeLanguage);
  await prisma.weaknessMap.upsert({
    where: { userId },
    create: { userId, scores, baselineScores: scores },
    update: {},
  });
  return scores;
}

export async function saveWeaknessSnapshot(
  userId: string,
  sessionId?: string
): Promise<void> {
  const map = await prisma.weaknessMap.findUnique({ where: { userId } });
  if (!map) return;

  await prisma.weaknessMapSnapshot.create({
    data: {
      userId,
      sessionId,
      scores: map.scores,
    },
  });
}

/** Resolve a dot-path like "grammar.deHet" into value from scores object */
export function getSubAxisValue(
  scores: WeaknessScores,
  path: string
): number {
  const parts = path.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = scores;
  for (const p of parts) {
    if (cur == null) return 50;
    cur = cur[p];
  }
  return typeof cur === "number" ? cur : 50;
}

/** Find the weakest sub-axis not in an excluded set */
export function findWeakestSubAxis(
  scores: WeaknessScores,
  excludePaths: string[] = []
): { path: string; value: number } {
  const flat = flattenScores(scores);
  const candidates = Object.entries(flat)
    .filter(([k]) => !excludePaths.includes(k))
    .sort(([, a], [, b]) => a - b);
  const [path, value] = candidates[0] ?? ["vocabulary.daily", 50];
  return { path, value };
}

export function flattenScores(scores: WeaknessScores): Record<string, number> {
  const out: Record<string, number> = {};
  function walk(obj: unknown, prefix: string) {
    if (typeof obj === "number") {
      out[prefix] = obj;
    } else if (typeof obj === "object" && obj !== null) {
      for (const [k, v] of Object.entries(obj)) {
        walk(v, prefix ? `${prefix}.${k}` : k);
      }
    }
  }
  walk(scores, "");
  return out;
}
