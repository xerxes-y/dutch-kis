"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

interface ErrorItem {
  original: string;
  correction: string;
  rule?: string;
  subAxis: string;
  rootCause: "INTERFERENCE" | "UNKNOWN" | "CONFUSION" | "CARELESS";
}

interface AnalysisResult {
  corrected: string;
  errors: ErrorItem[];
  examples: string[];
  score: number;
}

export default function FreeWritePage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [rawStream, setRawStream] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const streamRef = useRef("");

  async function handleAnalyze() {
    if (!text.trim()) return;
    setStreaming(true);
    setRawStream("");
    setResult(null);
    streamRef.current = "";

    const res = await fetch("/api/ai/freewrite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, sessionId }),
    });

    const sid = res.headers.get("X-Session-Id");
    if (sid) setSessionId(sid);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done: d, value } = await reader.read();
      if (d) break;
      const chunk = decoder.decode(value, { stream: true });
      streamRef.current += chunk;
      setRawStream((prev) => prev + chunk);
    }

    setStreaming(false);

    // Try to parse JSON from stream
    const jsonMatch = streamRef.current.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as AnalysisResult;
        setResult(parsed);

        // Persist mistakes to server
        if (sid && parsed.errors?.length) {
          await fetch("/api/ai/freewrite", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionId: sid,
              errors: parsed.errors,
            }),
          });
        }
      } catch {
        // stream wasn't valid JSON — show raw
      }
    }
  }

  async function handleFinish() {
    if (sessionId) {
      await fetch("/api/ai/freewrite", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, errors: [], finish: true }),
      });
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display text-2xl font-bold mb-2">Session complete!</h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>
            Your weakness map has been updated.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg font-semibold text-white"
            style={{ background: "var(--accent)" }}
          >
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">
          ← Dashboard
        </button>
        <h1 className="font-display text-3xl font-bold">✍️ Free Write</h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Write anything in Dutch — a diary entry, email, or random thoughts. The AI will analyze your mistakes.
        </p>
      </div>

      <div
        className="rounded-2xl border p-6 mb-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Schrijf hier in het Nederlands... (Write here in Dutch...)"
          rows={8}
          className="w-full bg-transparent outline-none resize-none text-sm leading-relaxed"
          style={{ color: "var(--foreground)" }}
        />
        <div className="flex justify-between items-center mt-3 pt-3 border-t"
          style={{ borderColor: "var(--card-border)" }}>
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {text.length} characters
          </span>
          <button
            onClick={handleAnalyze}
            disabled={streaming || !text.trim()}
            className="px-5 py-2 rounded-lg font-semibold text-white text-sm transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ background: "var(--accent)" }}
          >
            {streaming ? "Analyzing…" : "Analyze My Dutch →"}
          </button>
        </div>
      </div>

      {/* Streaming output */}
      {(streaming || rawStream) && !result && (
        <div
          className="rounded-2xl border p-6 mb-4 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          {rawStream}
          {streaming && <span className="animate-pulse">▋</span>}
        </div>
      )}

      {/* Parsed result */}
      {result && (
        <div className="flex flex-col gap-4">
          <div
            className="rounded-2xl border p-6"
            style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Corrected Version</h3>
              <span
                className="text-2xl font-bold"
                style={{ color: result.score >= 7 ? "var(--success)" : "var(--accent)" }}
              >
                {result.score}/10
              </span>
            </div>
            <p className="text-sm leading-relaxed">{result.corrected}</p>
          </div>

          {result.errors.length > 0 && (
            <div
              className="rounded-2xl border p-6"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <h3 className="font-semibold mb-3">
                {result.errors.length} Mistake{result.errors.length !== 1 ? "s" : ""}
              </h3>
              <div className="flex flex-col gap-3">
                {result.errors.map((err, i) => (
                  <div key={i} className="p-3 rounded-xl"
                    style={{ background: "var(--background)" }}>
                    <div className="flex gap-2 text-sm mb-1">
                      <span style={{ color: "var(--error)" }}>✗ {err.original}</span>
                      <span style={{ color: "var(--muted)" }}>→</span>
                      <span style={{ color: "var(--success)" }}>✓ {err.correction}</span>
                    </div>
                    {err.rule && (
                      <p className="text-xs" style={{ color: "var(--muted)" }}>
                        {err.rule}
                      </p>
                    )}
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded text-xs"
                      style={{ background: "var(--card-border)", color: "var(--muted)" }}
                    >
                      {err.rootCause}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {result.examples.length > 0 && (
            <div
              className="rounded-2xl border p-6"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <h3 className="font-semibold mb-3">Example Sentences</h3>
              <ul className="flex flex-col gap-2">
                {result.examples.map((ex, i) => (
                  <li key={i} className="text-sm pl-3 border-l-2"
                    style={{ borderColor: "var(--accent)" }}>
                    {ex}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => { setText(""); setResult(null); setRawStream(""); }}
              className="flex-1 py-3 rounded-xl border font-semibold text-sm"
              style={{ borderColor: "var(--card-border)" }}
            >
              Write Another
            </button>
            <button
              onClick={handleFinish}
              className="flex-1 py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: "var(--accent)" }}
            >
              Finish Session
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
