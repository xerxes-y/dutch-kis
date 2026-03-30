import { AppError } from "./errors";

const NLP_BASE = process.env.NLP_BASE_URL ?? "http://localhost:8001";

export interface NlpToken {
  text: string;
  lemma: string;
  pos: string;
  tag: string;
  dep: string;
  is_stop: boolean;
  morph: string;
}

export interface NlpAnalysis {
  text: string;
  tokens: NlpToken[];
  sentences: { text: string; start: number; end: number }[];
  entities: { text: string; label: string }[];
}

export interface DeHetResult {
  word: string;
  prediction: "de" | "het" | null;
  confidence: "rule-based" | "unknown";
}

export interface LemmaResult {
  word: string;
  lemma: string;
  pos: string;
}

async function post<T>(endpoint: string, body: unknown): Promise<T> {
  const res = await fetch(`${NLP_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new AppError("NLP_SERVICE_ERROR", {
      message: `NLP service ${endpoint} returned ${res.status}`,
      status: 502,
    });
  }
  return res.json() as Promise<T>;
}

export async function analyze(text: string): Promise<NlpAnalysis> {
  return post<NlpAnalysis>("/analyze", { text });
}

export async function checkDeHet(nouns: string[]): Promise<DeHetResult[]> {
  const data = await post<{ results: DeHetResult[] }>("/check-dehet", { nouns });
  return data.results;
}

export async function lemmatize(words: string[]): Promise<LemmaResult[]> {
  const data = await post<{ results: LemmaResult[] }>("/lemmatize", { words });
  return data.results;
}

/** Detect separable verb prefix splits using SpaCy dependency parsing */
export function detectSeparableVerbs(
  tokens: NlpToken[]
): { verb: string; prefix: string; position: number }[] {
  const pairs: { verb: string; prefix: string; position: number }[] = [];
  tokens.forEach((token, i) => {
    if (token.dep === "svp" && token.pos === "ADP") {
      const head = tokens.find(
        (t) => t.dep === "ROOT" || t.pos === "VERB"
      );
      if (head) {
        pairs.push({ verb: head.lemma, prefix: token.text, position: i });
      }
    }
  });
  return pairs;
}
