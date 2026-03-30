import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { chat } from "@/lib/ollama";
import { prisma } from "@/lib/prisma";
import { getWeaknessMap, findWeakestSubAxis } from "@/lib/weakness-map";

const GenerateSchema = z.object({
  domain: z.enum(["work", "family", "travel", "academic", "daily"]).optional(),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1"]).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = GenerateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const userId = session.user.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cefrLevel: true, learningGoal: true },
  });

  const cefrLevel = body.data.cefrLevel ?? user?.cefrLevel ?? "A2";

  // Find domain from weakness map
  const scores = await getWeaknessMap(userId);
  const { path: weakestAxis } = findWeakestSubAxis(scores);
  const domain =
    body.data.domain ??
    (weakestAxis.startsWith("vocabulary.")
      ? (weakestAxis.split(".")[1] as string)
      : "daily");

  // Get weak vocabulary to seed the story
  const seedVocab = await prisma.vocabulary.findMany({
    where: {
      userId,
      domain,
      fsrsDue: { lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { fsrsDue: "asc" },
    take: 5,
    select: { word: true, translation: true },
  });

  const seedWords = seedVocab.map((v) => v.word);
  const fallbackWords = ["werken", "gaan", "hebben", "zijn", "maken"];
  const wordsToUse = seedWords.length >= 3 ? seedWords : fallbackWords;

  const prompt = `Write a short Dutch story (6-8 sentences) at ${cefrLevel} level for a Dutch language learner.
Requirements:
- Domain/theme: ${domain}
- MUST naturally include these Dutch words: ${wordsToUse.join(", ")}
- Use vocabulary appropriate for ${cefrLevel} level (about 85% common words, 15% new)
- Make the story interesting and culturally Dutch
- Return ONLY valid JSON: {"title": "...", "content": "...", "vocabulary": [{"word": "...", "translation": "...", "sentence": "..."}]}
The vocabulary array should contain the seed words with their English translations.`;

  let raw: string;
  try {
    raw = await chat([{ role: "user", content: prompt }], 0.8);
  } catch {
    return NextResponse.json({ error: "AI_ERROR" }, { status: 502 });
  }

  // Extract JSON from the response
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return NextResponse.json({ error: "PARSE_ERROR" }, { status: 500 });
  }

  let storyData: { title: string; content: string; vocabulary: { word: string; translation: string; sentence: string }[] };
  try {
    storyData = JSON.parse(jsonMatch[0]) as typeof storyData;
  } catch {
    return NextResponse.json({ error: "PARSE_ERROR" }, { status: 500 });
  }

  // Estimate known vocabulary %
  const allWords = storyData.content.toLowerCase().split(/\W+/).filter(Boolean);
  const knownVocab = await prisma.vocabulary.findMany({
    where: { userId },
    select: { lemma: true },
  });
  const knownSet = new Set(knownVocab.map((v) => v.lemma.toLowerCase()));
  const knownPercent =
    allWords.length > 0
      ? (allWords.filter((w) => knownSet.has(w)).length / allWords.length) * 100
      : 70;

  // Save story
  const story = await prisma.story.create({
    data: {
      userId,
      title: storyData.title,
      content: storyData.content,
      cefrLevel,
      knownPercent,
      seedWords: wordsToUse,
      domain,
    },
  });

  return NextResponse.json({
    id: story.id,
    title: story.title,
    content: story.content,
    cefrLevel,
    knownPercent,
    vocabulary: storyData.vocabulary,
  });
}
