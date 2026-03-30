"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface VocabItem {
  id: string; word: string; lemma: string; translation: string | null;
  gender: string | null; fsrsState: number;
}

export default function SrsPage() {
  const router = useRouter();
  const [items, setItems] = useState<VocabItem[]>([]);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadDue = useCallback(async () => {
    const res = await fetch("/api/vocabulary?due=true&limit=20");
    const data = (await res.json()) as { items: VocabItem[] };
    setItems(data.items);
    setLoading(false);
  }, []);

  useEffect(() => { void loadDue(); }, [loadDue]);

  async function rate(rating: 1 | 2 | 3 | 4) {
    // 1=Again, 2=Hard, 3=Good, 4=Easy
    const item = items[idx];
    if (!item) return;

    await fetch(`/api/vocabulary/${item.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });

    if (idx >= items.length - 1) {
      setDone(true);
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  }

  function speak(text: string) {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "nl-NL";
    window.speechSynthesis.speak(utter);
  }

  if (loading) {
    return <main className="min-h-dvh flex items-center justify-center"><div className="animate-pulse">Loading your reviews…</div></main>;
  }

  if (items.length === 0) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="font-display text-2xl font-bold mb-2">All caught up!</h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>No cards due for review right now.</p>
          <button onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg font-semibold text-white" style={{ background: "var(--accent)" }}>
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  if (done) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🗂️</div>
          <h2 className="font-display text-2xl font-bold mb-2">Review complete!</h2>
          <p className="mb-6" style={{ color: "var(--muted)" }}>You reviewed {items.length} cards.</p>
          <button onClick={() => router.push("/dashboard")}
            className="px-6 py-3 rounded-lg font-semibold text-white" style={{ background: "var(--accent)" }}>
            Back to Dashboard
          </button>
        </div>
      </main>
    );
  }

  const item = items[idx]!;
  const progress = ((idx) / items.length) * 100;

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-lg mx-auto">
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">🗂️ SRS Review</h1>
        <span className="text-sm" style={{ color: "var(--muted)" }}>{idx + 1}/{items.length}</span>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 rounded-full mb-6" style={{ background: "var(--card-border)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: "var(--accent)" }} />
      </div>

      {/* Card */}
      <div
        className="rounded-2xl border p-8 text-center cursor-pointer transition-all hover:scale-[1.01] mb-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)", minHeight: 200 }}
        onClick={() => setFlipped(true)}
      >
        {!flipped ? (
          <div className="flex flex-col items-center justify-center h-full gap-4">
            <p className="font-display text-4xl font-bold">{item.word}</p>
            {item.gender && (
              <span className="text-sm px-3 py-1 rounded-full"
                style={{ background: "var(--card-border)", color: "var(--muted)" }}>
                {item.gender} {item.word}
              </span>
            )}
            <button onClick={(e) => { e.stopPropagation(); speak(item.word); }}
              className="text-sm px-4 py-2 rounded-lg border"
              style={{ borderColor: "var(--card-border)", color: "var(--muted)" }}>
              🔊 Hear
            </button>
            <p className="text-sm" style={{ color: "var(--muted)" }}>Tap to reveal</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3">
            <p className="font-display text-4xl font-bold">{item.word}</p>
            <div className="w-12 h-0.5 rounded" style={{ background: "var(--card-border)" }} />
            <p className="text-xl">{item.translation ?? "—"}</p>
          </div>
        )}
      </div>

      {flipped && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Again", value: 1, color: "var(--error)" },
            { label: "Hard", value: 2, color: "var(--warning)" },
            { label: "Good", value: 3, color: "var(--accent)" },
            { label: "Easy", value: 4, color: "var(--success)" },
          ].map((r) => (
            <button key={r.label} onClick={() => rate(r.value as 1 | 2 | 3 | 4)}
              className="py-3 rounded-xl font-semibold text-sm text-white"
              style={{ background: r.color }}>
              {r.label}
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
