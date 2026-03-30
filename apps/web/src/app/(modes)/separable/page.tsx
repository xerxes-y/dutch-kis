"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const SEPARABLE_VERBS = [
  { verb: "opbellen", prefix: "op", stem: "bel", sentence: "Ik ___ je morgen ___.", answer: ["bel", "op"], translation: "call up" },
  { verb: "aankomen", prefix: "aan", stem: "kom", sentence: "De trein ___ om 9 uur ___.", answer: ["komt", "aan"], translation: "arrive" },
  { verb: "meedenken", prefix: "mee", stem: "denk", sentence: "Kun jij ___?", answer: ["meedenken"], translation: "think along" },
  { verb: "uitkijken", prefix: "uit", stem: "kijk", sentence: "Kijk ___! Er komt een auto.", answer: ["uit"], translation: "watch out" },
  { verb: "afmaken", prefix: "af", stem: "maak", sentence: "Ik ___ het project morgen ___.", answer: ["maak", "af"], translation: "finish" },
  { verb: "meenemen", prefix: "mee", stem: "neem", sentence: "Hij ___ zijn fiets ___.", answer: ["neemt", "mee"], translation: "take along" },
  { verb: "opruimen", prefix: "op", stem: "ruim", sentence: "Wij ___ de kamer ___.", answer: ["ruimen", "op"], translation: "tidy up" },
  { verb: "terugkomen", prefix: "terug", stem: "kom", sentence: "Wanneer ___ je ___?", answer: ["kom", "terug"], translation: "come back" },
];

interface VerbItem { verb: string; prefix: string; stem: string; sentence: string; answer: string[]; translation: string }

export default function SeparablePage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [inputs, setInputs] = useState<string[]>(["", ""]);
  const [feedback, setFeedback] = useState<{ correct: boolean; explanation: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const item = SEPARABLE_VERBS[idx % SEPARABLE_VERBS.length] as VerbItem;
  const blanks = (item.sentence.match(/___/g) ?? []).length;

  function handleCheck() {
    const correct = inputs
      .slice(0, blanks)
      .every((v, i) => v.trim().toLowerCase() === item.answer[i]?.toLowerCase());

    setFeedback({
      correct,
      explanation: correct
        ? `Correct! In a main clause, "${item.verb}" splits: the prefix "${item.prefix}" goes to the end.`
        : `The correct form: "${item.sentence.replace(/___/g, (_, i) => item.answer[i] ?? "_")}". The prefix "${item.prefix}" splits to the end of the main clause.`,
    });
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  }

  function handleNext() {
    if (idx >= SEPARABLE_VERBS.length - 1) {
      setFinished(true);
    } else {
      setIdx((i) => i + 1);
      setInputs(["", ""]);
      setFeedback(null);
    }
  }

  if (finished) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🔀</div>
          <h2 className="font-display text-2xl font-bold mb-2">Training Complete!</h2>
          <p className="text-lg mb-6">Score: <strong>{score.correct}/{score.total}</strong></p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setFinished(false); setIdx(0); setScore({ correct: 0, total: 0 }); setFeedback(null); setInputs(["", ""]); }}
              className="px-6 py-3 rounded-lg font-semibold text-white" style={{ background: "var(--accent)" }}>
              Practice Again
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

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto">
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <h1 className="font-display text-3xl font-bold mb-1">🔀 Separable Verbs</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>Fill in the blanks — remember the prefix splits!</p>

      <div className="rounded-2xl border p-8"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <div className="text-center mb-6">
          <span className="text-xs uppercase tracking-widest px-3 py-1 rounded-full"
            style={{ background: "var(--card-border)", color: "var(--muted)" }}>
            infinitive
          </span>
          <p className="font-display text-4xl font-bold mt-2">{item.verb}</p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>{item.translation}</p>
        </div>

        <div className="text-lg text-center mb-6 leading-loose">
          {item.sentence.split("___").map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                <input
                  value={inputs[i] ?? ""}
                  onChange={(e) => {
                    const next = [...inputs];
                    next[i] = e.target.value;
                    setInputs(next);
                  }}
                  disabled={!!feedback}
                  className="inline-block w-28 border-b-2 text-center bg-transparent outline-none mx-1 pb-1 font-semibold"
                  style={{ borderColor: feedback ? (feedback.correct ? "var(--success)" : "var(--error)") : "var(--accent)" }}
                />
              )}
            </span>
          ))}
        </div>

        {!feedback ? (
          <button onClick={handleCheck} disabled={inputs.slice(0, blanks).some((v) => !v.trim())}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}>
            Check
          </button>
        ) : (
          <div>
            <div className={`p-4 rounded-xl mb-4 text-sm ${feedback.correct ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"}`}>
              {feedback.explanation}
            </div>
            <button onClick={handleNext}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "var(--accent)" }}>
              {idx >= SEPARABLE_VERBS.length - 1 ? "See Results" : "Next →"}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-sm mt-4" style={{ color: "var(--muted)" }}>
        {idx + 1} / {SEPARABLE_VERBS.length} — Score: {score.correct}/{score.total}
      </div>
    </main>
  );
}
