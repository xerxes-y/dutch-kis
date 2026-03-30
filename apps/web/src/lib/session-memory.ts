import { prisma } from "./prisma";
import { embed } from "./ollama";

/** Save a session memory embedding for cross-session AI context */
export async function saveSessionMemory(
  userId: string,
  sessionId: string,
  summary: string
): Promise<void> {
  try {
    const embedding = await embed(summary);
    const vectorLiteral = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SessionMemory" (id, "createdAt", "userId", "sessionId", summary, embedding)
       VALUES (gen_random_uuid(), now(), $1, $2, $3, $4::vector)
       ON CONFLICT ("sessionId") DO UPDATE SET summary = $3, embedding = $4::vector`,
      userId,
      sessionId,
      summary,
      vectorLiteral
    );
  } catch {
    // Non-critical — don't fail session end if memory save fails
  }
}

/** Retrieve top-3 most relevant past session summaries for AI context */
export async function getRelevantMemories(
  userId: string,
  contextText: string,
  limit = 3
): Promise<string[]> {
  try {
    const queryEmbedding = await embed(contextText);
    const vectorLiteral = `[${queryEmbedding.join(",")}]`;

    const results = await prisma.$queryRawUnsafe<{ summary: string }[]>(
      `SELECT summary
       FROM "SessionMemory"
       WHERE "userId" = $1
       ORDER BY embedding <=> $2::vector
       LIMIT $3`,
      userId,
      vectorLiteral,
      limit
    );

    return results.map((r) => r.summary);
  } catch {
    return [];
  }
}

/** Build the AI system prompt with injected session memories */
export async function buildSystemPrompt(opts: {
  userId: string;
  contextText: string;
  basePrompt: string;
  correctionStyle?: string;
  cefrLevel?: string;
  learningGoal?: string;
}): Promise<string> {
  const memories = await getRelevantMemories(opts.userId, opts.contextText);

  const memorySection =
    memories.length > 0
      ? `\n\n## Your memory of this learner:\n${memories
          .map((m, i) => `${i + 1}. ${m}`)
          .join("\n")}`
      : "";

  const correctionInstruction =
    opts.correctionStyle === "immersive"
      ? "Correct mistakes silently by using the correct form naturally in your response. Never explicitly point out errors."
      : opts.correctionStyle === "explicit"
      ? "When you notice a mistake, pause and explicitly explain the rule, then ask the learner to try again."
      : "At the end of your turn, gently highlight any significant mistakes with a brief rule reminder.";

  return `${opts.basePrompt}

## Learner context:
- CEFR level: ${opts.cefrLevel ?? "A2"}
- Learning goal: ${opts.learningGoal ?? "general"}
- Correction style: ${correctionInstruction}
${memorySection}`;
}
