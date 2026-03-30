import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { checkDeHet } from "@/lib/nlp";
import { prisma } from "@/lib/prisma";
import { updateSubAxis, recordMistakeAndUpdate } from "@/lib/bkt";

const QuestionSchema = z.object({
  sessionId: z.string(),
  word: z.string(),
  answer: z.enum(["de", "het"]),
  responseTimeMs: z.number(),
  confidenceLevel: z.enum(["sure", "unsure", "guessing"]).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const count = Math.min(parseInt(searchParams.get("count") ?? "10"), 20);

  // Fetch words from user's vocabulary that are nouns
  const words = await prisma.vocabulary.findMany({
    where: { userId: session.user.id, pos: "NOUN" },
    orderBy: { fsrsDue: "asc" },
    take: count,
    select: { word: true, lemma: true, gender: true },
  });

  // Supplement with common Dutch words if not enough
  const commonNouns = [
    { word: "huis", lemma: "huis", gender: "het" },
    { word: "boek", lemma: "boek", gender: "het" },
    { word: "man", lemma: "man", gender: "de" },
    { word: "vrouw", lemma: "vrouw", gender: "de" },
    { word: "kind", lemma: "kind", gender: "het" },
    { word: "fiets", lemma: "fiets", gender: "de" },
    { word: "tafel", lemma: "tafel", gender: "de" },
    { word: "water", lemma: "water", gender: "het" },
    { word: "tijd", lemma: "tijd", gender: "de" },
    { word: "dag", lemma: "dag", gender: "de" },
  ];

  const items =
    words.length >= count
      ? words
      : [...words, ...commonNouns].slice(0, count);

  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = QuestionSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const userId = session.user.id;

  // Get the correct answer
  const vocab = await prisma.vocabulary.findFirst({
    where: { userId, lemma: body.data.word },
    select: { gender: true },
  });

  // Fallback to SpaCy rule-based check
  let correctGender = vocab?.gender;
  if (!correctGender) {
    const results = await checkDeHet([body.data.word]);
    correctGender = results[0]?.prediction ?? null;
  }

  const correct = body.data.answer === correctGender;

  await prisma.answerEvent.create({
    data: {
      userId,
      sessionId: body.data.sessionId,
      exerciseType: "dehet",
      subAxis: "grammar.deHet",
      correct,
      responseTimeMs: body.data.responseTimeMs,
      confidenceLevel: body.data.confidenceLevel,
      rootCause: correct ? null : "UNKNOWN",
    },
  });

  if (correct) {
    await updateSubAxis(userId, "grammar.deHet", {
      correct: true,
      responseTimeMs: body.data.responseTimeMs,
      confidenceLevel: body.data.confidenceLevel,
    });
  } else {
    await recordMistakeAndUpdate({
      userId,
      sessionId: body.data.sessionId,
      subAxis: "grammar.deHet",
      category: "de_het",
      rootCause: "UNKNOWN",
      original: `${body.data.answer} ${body.data.word}`,
      correction: `${correctGender} ${body.data.word}`,
    });
  }

  return NextResponse.json({
    correct,
    correctAnswer: correctGender,
    rule: getDeHetRule(body.data.word),
  });
}

function getDeHetRule(word: string): string {
  const w = word.toLowerCase();
  if (w.endsWith("je") || w.endsWith("tje")) return "Diminutives (-tje) are always HET";
  if (w.endsWith("heid")) return "Words ending in -heid are always DE";
  if (w.endsWith("schap")) return "Words ending in -schap are always DE";
  if (w.endsWith("ing")) return "Words ending in -ing are always DE";
  if (w.endsWith("iteit")) return "Words ending in -iteit are always DE";
  if (w.endsWith("tie")) return "Words ending in -tie are always DE";
  return "This word must be learned by heart — about 75% of Dutch nouns use DE";
}
