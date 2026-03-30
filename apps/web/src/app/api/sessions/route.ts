import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodaysFocus } from "@/lib/smart-start";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const focus = await getTodaysFocus(session.user.id);
  return NextResponse.json(focus);
}

const CreateSchema = z.object({
  mode: z.enum([
    "freewrite",
    "roleplay",
    "story",
    "dehet",
    "separable",
    "wordorder",
    "phonetic",
    "srs",
    "inburgering",
  ]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = CreateSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const ls = await prisma.learningSession.create({
    data: { userId: session.user.id, mode: body.data.mode },
  });

  // Update session continuity
  await prisma.sessionContinuity.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      lastMode: body.data.mode,
      lastContext: { sessionId: ls.id },
      canResume: false,
    },
    update: {
      lastMode: body.data.mode,
      lastContext: { sessionId: ls.id },
      canResume: false,
    },
  });

  return NextResponse.json({ sessionId: ls.id });
}
