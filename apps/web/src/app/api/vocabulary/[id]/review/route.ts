import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { fsrs, createEmptyCard, Rating, type RecordLogItem } from "ts-fsrs";

const RatingSchema = z.object({
  rating: z.number().int().min(1).max(4),
});

const f = fsrs();

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = RatingSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const { id } = await params;

  const vocab = await prisma.vocabulary.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!vocab) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // Reconstruct FSRS card state
  const card = {
    ...createEmptyCard(),
    due: vocab.fsrsDue,
    stability: vocab.fsrsStability,
    difficulty: vocab.fsrsDifficulty,
    elapsed_days: vocab.fsrsElapsedDays,
    scheduled_days: vocab.fsrsScheduledDays,
    reps: vocab.fsrsReps,
    lapses: vocab.fsrsLapses,
    state: vocab.fsrsState as 0 | 1 | 2 | 3,
  };

  const ratingMap: Record<number, Rating> = {
    1: Rating.Again,
    2: Rating.Hard,
    3: Rating.Good,
    4: Rating.Easy,
  };

  const schedulingCards = f.repeat(card, new Date());
  const result = schedulingCards[ratingMap[body.data.rating]!] as RecordLogItem;

  await prisma.vocabulary.update({
    where: { id },
    data: {
      fsrsDue: result.card.due,
      fsrsStability: result.card.stability,
      fsrsDifficulty: result.card.difficulty,
      fsrsElapsedDays: result.card.elapsed_days,
      fsrsScheduledDays: result.card.scheduled_days,
      fsrsReps: result.card.reps,
      fsrsLapses: result.card.lapses,
      fsrsState: result.card.state,
    },
  });

  return NextResponse.json({ nextDue: result.card.due });
}
