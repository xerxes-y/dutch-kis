import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { analyze } from "@/lib/nlp";
import { buildSystemPrompt } from "@/lib/session-memory";
import { createOllamaStream } from "@/lib/ollama";
import { prisma } from "@/lib/prisma";
import { recordMistakeAndUpdate, endSession } from "@/lib/bkt";

const BodySchema = z.object({
  text: z.string().min(1).max(5000),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: body.error.issues },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  // Ensure session exists
  let learningSessionId = body.data.sessionId;
  if (!learningSessionId) {
    const ls = await prisma.learningSession.create({
      data: { userId, mode: "freewrite" },
    });
    learningSessionId = ls.id;
  }

  // Pre-analyze with SpaCy
  const nlpAnalysis = await analyze(body.data.text).catch(() => null);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cefrLevel: true, correctionStyle: true, learningGoal: true },
  });

  const systemPrompt = await buildSystemPrompt({
    userId,
    contextText: body.data.text,
    basePrompt: `You are a Dutch language teacher. The learner has written the following Dutch text. 
Analyze it carefully and provide:
1. Corrected version with errors marked in [brackets]
2. Explanation of each error with the grammar rule
3. 2-3 example sentences showing the correct pattern
4. A score (1-10) for fluency and accuracy

SpaCy NLP analysis: ${JSON.stringify(nlpAnalysis?.tokens?.slice(0, 20) ?? [])}

Be encouraging and specific. Format your response as JSON with keys: corrected, errors (array of {original, correction, rule, subAxis, rootCause}), examples, score.`,
    correctionStyle: user?.correctionStyle ?? "guided",
    cefrLevel: user?.cefrLevel ?? "A2",
    learningGoal: user?.learningGoal ?? "general",
  });

  const stream = createOllamaStream(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: body.data.text },
    ],
    0.3
  );

  // Return streaming response with session ID in header
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Session-Id": learningSessionId,
    },
  });
}

// Called by client after stream finishes to persist mistakes
export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const FinishSchema = z.object({
    sessionId: z.string(),
    errors: z.array(
      z.object({
        original: z.string(),
        correction: z.string(),
        rule: z.string().optional(),
        subAxis: z.string(),
        rootCause: z.enum(["INTERFERENCE", "UNKNOWN", "CONFUSION", "CARELESS"]),
        responseTimeMs: z.number().optional(),
      })
    ),
    finish: z.boolean().optional(),
  });

  const body = FinishSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const userId = session.user.id;

  await Promise.all(
    body.data.errors.map((e) =>
      recordMistakeAndUpdate({
        userId,
        sessionId: body.data.sessionId,
        subAxis: e.subAxis,
        category: e.subAxis.split(".").pop() ?? "grammar",
        rootCause: e.rootCause,
        original: e.original,
        correction: e.correction,
        explanation: e.rule,
        responseTimeMs: e.responseTimeMs,
      })
    )
  );

  if (body.data.finish) {
    await endSession(userId, body.data.sessionId);
  }

  return NextResponse.json({ ok: true });
}
