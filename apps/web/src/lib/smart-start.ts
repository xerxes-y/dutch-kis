import { prisma } from "./prisma";
import { getWeaknessMap, findWeakestSubAxis } from "./weakness-map";

export const WEAKNESS_TO_MODE: Record<
  string,
  { mode: string; label: string; path: string }
> = {
  "grammar.deHet":              { mode: "dehet",     label: "De/Het Oracle",         path: "/dehet" },
  "grammar.separableVerbs":     { mode: "separable", label: "Separable Verb Trainer", path: "/separable" },
  "grammar.v2WordOrder":        { mode: "wordorder", label: "Word Order Puzzle",      path: "/wordorder" },
  "grammar.subordinateClauses": { mode: "wordorder", label: "Word Order Puzzle",      path: "/wordorder" },
  "grammar.verbConjugation":    { mode: "freewrite", label: "Free Write",             path: "/freewrite" },
  "grammar.tenseUsage":         { mode: "freewrite", label: "Free Write",             path: "/freewrite" },
  "pronunciation.gSchSounds":   { mode: "phonetic",  label: "Phonetic Studio",        path: "/phonetic" },
  "pronunciation.uiIjDiphthongs":{ mode: "phonetic", label: "Phonetic Studio",        path: "/phonetic" },
  "pronunciation.longVowels":   { mode: "phonetic",  label: "Phonetic Studio",        path: "/phonetic" },
  "pronunciation.wordStress":   { mode: "phonetic",  label: "Phonetic Studio",        path: "/phonetic" },
  "listening":                  { mode: "roleplay",  label: "Conversational Roleplay", path: "/roleplay" },
  "writing.formalRegister":     { mode: "freewrite", label: "Free Write",             path: "/freewrite" },
  "writing.informalRegister":   { mode: "freewrite", label: "Free Write",             path: "/freewrite" },
  "writing.emailStructure":     { mode: "freewrite", label: "Free Write",             path: "/freewrite" },
  "register.formalU":           { mode: "freewrite", label: "Free Write",             path: "/freewrite" },
  "register.informalJij":       { mode: "roleplay",  label: "Conversational Roleplay", path: "/roleplay" },
  "register.idioms":            { mode: "story",     label: "AI Story Engine",        path: "/story" },
  "vocabulary.work":            { mode: "story",     label: "AI Story Engine",        path: "/story" },
  "vocabulary.family":          { mode: "story",     label: "AI Story Engine",        path: "/story" },
  "vocabulary.travel":          { mode: "story",     label: "AI Story Engine",        path: "/story" },
  "vocabulary.academic":        { mode: "story",     label: "AI Story Engine",        path: "/story" },
  "vocabulary.daily":           { mode: "story",     label: "AI Story Engine",        path: "/story" },
};

export interface TodaysFocus {
  primary: { label: string; path: string; reason: string };
  alternatives: { label: string; path: string }[];
  srsCount: number;
  canResume: boolean;
  resumeContext?: { mode: string; path: string; label: string };
}

export async function getTodaysFocus(userId: string): Promise<TodaysFocus> {
  // 1. SRS due cards
  const srsCount = await prisma.vocabulary.count({
    where: {
      userId,
      fsrsDue: { lte: new Date() },
    },
  });

  // 2. Session continuity
  const continuity = await prisma.sessionContinuity.findUnique({
    where: { userId },
  });
  const canResume = continuity?.canResume === true;
  const resumeContext = canResume && continuity
    ? {
        mode: continuity.lastMode,
        path: `/${continuity.lastMode}`,
        label: WEAKNESS_TO_MODE[continuity.lastMode]?.label ?? "Continue Session",
      }
    : undefined;

  // 3. Weakest sub-axis not practiced in 48h
  const recentAxes = await getRecentlyPracticedAxes(userId);
  const scores = await getWeaknessMap(userId);
  const { path: weakestPath } = findWeakestSubAxis(scores, recentAxes);

  const modeForWeakest = WEAKNESS_TO_MODE[weakestPath] ?? {
    mode: "story",
    label: "AI Story Engine",
    path: "/story",
  };

  const alternatives = [
    { label: "Free Write", path: "/freewrite" },
    { label: "SRS Review", path: "/srs" },
    { label: "Conversational Roleplay", path: "/roleplay" },
  ]
    .filter((a) => a.path !== modeForWeakest.path)
    .slice(0, 2);

  return {
    primary: {
      label: modeForWeakest.label,
      path: modeForWeakest.path,
      reason: `Your ${weakestPath.split(".").pop()} needs practice`,
    },
    alternatives,
    srsCount,
    canResume,
    resumeContext,
  };
}

async function getRecentlyPracticedAxes(userId: string): Promise<string[]> {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const events = await prisma.answerEvent.findMany({
    where: { userId, createdAt: { gte: cutoff } },
    select: { subAxis: true },
    distinct: ["subAxis"],
  });
  return events.map((e) => e.subAxis);
}
