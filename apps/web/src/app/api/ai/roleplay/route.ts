import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildSystemPrompt } from "@/lib/session-memory";
import { createOllamaStream } from "@/lib/ollama";
import { prisma } from "@/lib/prisma";
import { endSession } from "@/lib/bkt";

export const SCENARIOS = {
  bakery: {
    label: "At the Bakery",
    description: "Order bread, pastries, and ask about prices.",
    aiRole: "bakery employee at a Dutch 'bakkerij'",
    vocabulary: ["brood", "appeltaart", "hoeveel kost", "alstublieft", "graag"],
  },
  job_interview: {
    label: "Job Interview",
    description: "Practice Dutch work vocabulary and formal register.",
    aiRole: "Dutch HR manager conducting a job interview",
    vocabulary: ["sollicitatie", "ervaring", "functie", "werktijden", "salaris"],
  },
  apartment: {
    label: "Finding an Apartment",
    description: "Discuss rent, location, and facilities.",
    aiRole: "Dutch landlord showing an apartment",
    vocabulary: ["huur", "kamer", "vierkante meter", "borg", "contract"],
  },
  train: {
    label: "At the Train Station",
    description: "Buy tickets, ask about platforms and delays.",
    aiRole: "NS train station employee",
    vocabulary: ["trein", "perron", "vertraging", "enkeltje", "retourtje"],
  },
  doctor: {
    label: "At the Doctor",
    description: "Describe symptoms and understand medical advice.",
    aiRole: "Dutch huisarts (general practitioner)",
    vocabulary: ["pijn", "klachten", "recept", "apotheek", "afspraak"],
  },
};

const BodySchema = z.object({
  scenario: z.enum(["bakery", "job_interview", "apartment", "train", "doctor"]),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  sessionId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = BodySchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const userId = session.user.id;
  const scenario = SCENARIOS[body.data.scenario];

  let learningSessionId = body.data.sessionId;
  if (!learningSessionId) {
    const ls = await prisma.learningSession.create({
      data: {
        userId,
        mode: "roleplay",
        transcript: { scenario: body.data.scenario, messages: [] },
      },
    });
    learningSessionId = ls.id;
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cefrLevel: true, correctionStyle: true, learningGoal: true },
  });

  const lastUserMessage =
    body.data.messages.filter((m) => m.role === "user").pop()?.content ?? "";

  const systemPrompt = await buildSystemPrompt({
    userId,
    contextText: lastUserMessage,
    basePrompt: `You are playing the role of a ${scenario.aiRole} in the Netherlands.
Speak ONLY in Dutch. Keep your responses natural, conversational, and appropriate to the scenario.
If the learner makes a Dutch mistake, note it at the END of your response in a section marked [Taalfeedback:].
Useful vocabulary for this scenario: ${scenario.vocabulary.join(", ")}.
If the learner seems to be struggling, offer a gentle hint in parentheses.`,
    correctionStyle: user?.correctionStyle ?? "guided",
    cefrLevel: user?.cefrLevel ?? "A2",
    learningGoal: user?.learningGoal ?? "general",
  });

  const messages = [
    { role: "system" as const, content: systemPrompt },
    ...body.data.messages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
  ];

  const stream = createOllamaStream(messages, 0.8);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Session-Id": learningSessionId,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { sessionId } = (await req.json()) as { sessionId: string };
  if (!sessionId) {
    return NextResponse.json({ error: "MISSING_SESSION_ID" }, { status: 400 });
  }

  await endSession(session.user.id, sessionId);
  return NextResponse.json({ ok: true });
}
