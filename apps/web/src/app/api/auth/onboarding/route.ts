import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { initWeaknessMap } from "@/lib/weakness-map";

const OnboardingSchema = z.object({
  nativeLanguage: z.string(),
  learningGoal: z.string(),
  cefrLevel: z.string(),
  dailyTimeBudget: z.number().int().min(5).max(120),
  correctionStyle: z.enum(["immersive", "guided", "explicit"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = OnboardingSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const userId = session.user.id;

  await prisma.user.update({
    where: { id: userId },
    data: {
      nativeLanguage: body.data.nativeLanguage,
      learningGoal: body.data.learningGoal,
      cefrLevel: body.data.cefrLevel,
      dailyTimeBudget: body.data.dailyTimeBudget,
      correctionStyle: body.data.correctionStyle,
      onboardingDone: true,
    },
  });

  // Initialize weakness map with native language pre-weights
  await initWeaknessMap(userId, body.data.nativeLanguage);

  // Create initial streak record
  await prisma.streak.upsert({
    where: { userId },
    create: { userId, currentStreak: 0, longestStreak: 0, totalXp: 0 },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
