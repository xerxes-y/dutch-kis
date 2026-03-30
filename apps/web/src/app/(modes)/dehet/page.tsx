"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface WordItem { word: string; lemma: string; gender: string | null }

export default function DeHetPage() {
  const router = useRouter();
  const [items, setItems] = useState<WordItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; answer: string; rule: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [startTime, setStartTime] = useState(Date.now());
  const [confidence, setConfidence] = useState<"sure" | "unsure" | "guessing" | null>(null);
  const [finished, setFinished] = useState(false);

  const loadItems = useCallback(async () => {
    const res = await fetch("/api/ai/dehet?count=10");
    const data = (await res.json()) as { items: WordItem[] };
    setItems(data.items);
    setStartTime(Date.now());

    const sr = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "dehet" }),
    });
    const sd = (await sr.json()) as { sessionId: string };
    setSessionId(sd.sessionId);
  }, []);

  useEffect(() => { void loadItems(); }, [loadItems]);

  async function handleAnswer(answer: "de" | "het") {
    if (!confidence || feedback || !items[idx]) return;
    const responseTimeMs = Date.now() - startTime;

    const res = await fetch("/api/ai/dehet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        word: items[idx].lemma,
        answer,
        responseTimeMs,
        confidenceLevel: confidence,
      }),
    });

    const data = (await res.json()) as { correct: boolean; correctAnswer: string; rule: string };
    setFeedback({ correct: data.correct, answer: data.correctAnswer, rule: data.rule });
    setScore((s) => ({
      correct: s.correct + (data.correct ? 1 : 0),
      total: s.total + 1,
    }));
  }

  function next() {
    if (idx >= items.length - 1) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setFeedback(null);
      setConfidence(null);
      setStartTime(Date.now());
    }
  }

  if (finished) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="font-display text-2xl font-bold mb-2">Round Complete!</h2>
          <p className="text-lg mb-6">
            Score: <strong>{score.correct}/{score.total}</strong>
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setFinished(false); setIdx(0); setScore({ correct: 0, total: 0 }); void loadItems(); }}
              className="px-6 py-3 rounded-lg font-semibold text-white" style={{ background: "var(--accent)" }}>
              Play Again
            </button>
            <button onClick={() => router.push("/dashboard")}
              className="px-6 py-3 rounded-lg font-semibold border" style={{ borderColor: "var(--card-border)" }}>
              Dashboard
            </button>
          </div>
        </div>
      </main>
    );
  }

  const current = items[idx];
  if (!current) {
    return <main className="min-h-dvh flex items-center justify-center"><div className="animate-pulse">Loading…</div></main>;
  }

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-lg mx-auto">
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <div className="flex justify-between items-center mb-6">
        <h1 className="font-display text-2xl font-bold">🔤 De/Het Oracle</h1>
        <span className="text-sm" style={{ color: "var(--muted)" }}>{idx + 1}/{items.length}</span>
      </div>

      <div className="rounded-2xl border p-8 text-center mb-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>Which article?</p>
        <p className="font-display text-5xl font-bold mb-6">{current.word}</p>

        {/* Confidence selector */}
        {!feedback && (
          <div className="mb-6">
            <p className="text-xs mb-2" style={{ color: "var(--muted)" }}>How sure are you?</p>
            <div className="flex gap-2 justify-center">
              {(["sure", "unsure", "guessing"] as const).map((c) => (
                <button key={c} onClick={() => setConfidence(c)}
                  className="px-3 py-1.5 rounded-lg text-sm border transition-all"
                  style={{
                    borderColor: confidence === c ? "var(--accent)" : "var(--card-border)",
                    color: confidence === c ? "var(--accent)" : "var(--muted)",
                    background: confidence === c ? "var(--accent-muted)" : "transparent",
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        )}

        {!feedback ? (
          <div className="flex gap-4 justify-center">
            {(["de", "het"] as const).map((a) => (
              <button key={a} onClick={() => handleAnswer(a)} disabled={!confidence}
                className="w-28 py-4 rounded-xl font-display text-xl font-bold border-2 transition-all hover:scale-105 disabled:opacity-40"
                style={{ borderColor: "var(--card-border)", background: "var(--background)" }}>
                {a}
              </button>
            ))}
          </div>
        ) : (
          <div>
            <div className={`text-4xl mb-3 ${feedback.correct ? "text-green-500" : "text-red-500"}`}>
              {feedback.correct ? "✓" : "✗"}
            </div>
            <p className="font-bold mb-2">
              {feedback.correct ? "Correct!" : `It's: ${feedback.answer} ${current.word}`}
            </p>
            <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>{feedback.rule}</p>
            <button onClick={next}
              className="px-6 py-3 rounded-lg font-semibold text-white"
              style={{ background: "var(--accent)" }}>
              {idx >= items.length - 1 ? "See Results" : "Next Word →"}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-sm" style={{ color: "var(--muted)" }}>
        {score.correct}/{score.total} correct so far
      </div>
    </main>
  );
}
