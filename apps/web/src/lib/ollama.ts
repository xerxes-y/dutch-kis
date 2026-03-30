import { AppError } from "./errors";

const BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
const CHAT_MODEL = process.env.OLLAMA_CHAT_MODEL ?? "llama3.2";
const EMBED_MODEL = process.env.OLLAMA_EMBED_MODEL ?? "nomic-embed-text";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  onToken?: (token: string) => void;
}

/** Stream chat completions — returns the full text and calls onToken per chunk */
export async function streamChat(opts: StreamChatOptions): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages: opts.messages,
      stream: true,
      options: { temperature: opts.temperature ?? 0.7 },
    }),
  });

  if (!res.ok) {
    throw new AppError("OLLAMA_CHAT_ERROR", {
      message: `Ollama returned ${res.status}`,
      status: 502,
    });
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line) as {
          message?: { content: string };
          done?: boolean;
        };
        const token = data.message?.content ?? "";
        full += token;
        opts.onToken?.(token);
      } catch {
        // skip malformed lines
      }
    }
  }

  return full;
}

/** Non-streaming chat — returns full response string */
export async function chat(messages: ChatMessage[], temperature = 0.7): Promise<string> {
  return streamChat({ messages, temperature });
}

/** Create a ReadableStream for Next.js streaming responses */
export function createOllamaStream(messages: ChatMessage[], temperature = 0.7): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        await streamChat({
          messages,
          temperature,
          onToken: (token) => {
            controller.enqueue(encoder.encode(token));
          },
        });
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });
}

/** Generate an embedding vector for a text string */
export async function embed(text: string): Promise<number[]> {
  const res = await fetch(`${BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBED_MODEL, prompt: text }),
  });

  if (!res.ok) {
    throw new AppError("OLLAMA_EMBED_ERROR", {
      message: `Ollama embed returned ${res.status}`,
      status: 502,
    });
  }

  const data = (await res.json()) as { embedding: number[] };
  return data.embedding;
}

/** Generate embeddings for multiple texts in parallel (batched) */
export async function embedBatch(
  texts: string[],
  batchSize = 10
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const embeddings = await Promise.all(batch.map(embed));
    results.push(...embeddings);
  }
  return results;
}
