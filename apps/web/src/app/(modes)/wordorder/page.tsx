"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Puzzle {
  words: string[];
  correct: string[];
  rule: string;
  type: "v2" | "subordinate";
}

const PUZZLES: Puzzle[] = [
  { words: ["morgen", "ik", "ga", "naar", "Amsterdam"], correct: ["morgen", "ga", "ik", "naar", "Amsterdam"], rule: "V2 rule: When 'morgen' starts the sentence, verb comes second, subject third.", type: "v2" },
  { words: ["ik", "weet", "dat", "hij", "thuis", "is"], correct: ["ik", "weet", "dat", "hij", "thuis", "is"], rule: "Subordinate clause: After 'dat', the verb moves to the end.", type: "subordinate" },
  { words: ["gisteren", "ze", "heeft", "gewerkt"], correct: ["gisteren", "heeft", "ze", "gewerkt"], rule: "V2 rule: 'gisteren' is first, so verb 'heeft' is second, subject 'ze' third.", type: "v2" },
  { words: ["hij", "zegt", "dat", "het", "regent", "hard"], correct: ["hij", "zegt", "dat", "het", "hard", "regent"], rule: "Subordinate clause: 'hard' (adverb) comes before the verb at the end.", type: "subordinate" },
  { words: ["in", "Nederland", "fietsen", "veel", "mensen"], correct: ["in", "Nederland", "fietsen", "veel", "mensen"], rule: "V2 rule: Prepositional phrase first → verb second.", type: "v2" },
];

export default function WordOrderPage() {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [arranged, setArranged] = useState<string[]>([]);
  const [pool, setPool] = useState<string[]>([...PUZZLES[0]!.words]);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [finished, setFinished] = useState(false);

  const puzzle = PUZZLES[idx]!;

  function pickWord(word: string, from: "pool" | "arranged", wordIdx: number) {
    if (feedback) return;
    if (from === "pool") {
      setArranged((a) => [...a, word]);
      setPool((p) => p.filter((_, i) => i !== wordIdx));
    } else {
      setPool((p) => [...p, word]);
      setArranged((a) => a.filter((_, i) => i !== wordIdx));
    }
  }

  function checkAnswer() {
    const correct = arranged.join(" ") === puzzle.correct.join(" ");
    setFeedback({
      correct,
      message: correct ? `Correct! ${puzzle.rule}` : `Not quite. Correct order: "${puzzle.correct.join(" ")}". ${puzzle.rule}`,
    });
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), total: s.total + 1 }));
  }

  function nextPuzzle() {
    if (idx >= PUZZLES.length - 1) { setFinished(true); return; }
    const nextIdx = idx + 1;
    setIdx(nextIdx);
    setArranged([]);
    setPool([...PUZZLES[nextIdx]!.words]);
    setFeedback(null);
  }

  if (finished) {
    return (
      <main className="min-h-dvh flex items-center justify-center p-8">
        <div className="text-center">
          <div className="text-5xl mb-4">🧩</div>
          <h2 className="font-display text-2xl font-bold mb-2">Word Order Master!</h2>
          <p className="text-lg mb-6">Score: <strong>{score.correct}/{score.total}</strong></p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => { setFinished(false); setIdx(0); setScore({ correct: 0, total: 0 }); setPool([...PUZZLES[0]!.words]); setArranged([]); setFeedback(null); }}
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

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-2xl mx-auto">
      <button onClick={() => router.push("/dashboard")} className="text-sm mb-4 opacity-60 hover:opacity-100">← Dashboard</button>
      <h1 className="font-display text-3xl font-bold mb-1">🧩 Word Order Puzzle</h1>
      <p className="text-sm mb-6" style={{ color: "var(--muted)" }}>
        {puzzle.type === "v2" ? "V2 Rule: verb is always second in main clauses" : "Subordinate clause: verb goes to the end"}
      </p>

      <div className="rounded-2xl border p-6 mb-4"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
        <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--accent)" }}>
          {puzzle.type === "v2" ? "Main Clause — V2 Rule" : "Subordinate Clause"}
        </div>

        {/* Sentence area */}
        <div className="min-h-16 flex flex-wrap gap-2 items-center p-3 rounded-xl mb-4 border-2 border-dashed"
          style={{ borderColor: "var(--card-border)" }}>
          {arranged.length === 0 && (
            <span className="text-sm" style={{ color: "var(--muted)" }}>Click words to build your sentence…</span>
          )}
          {arranged.map((w, i) => (
            <button key={i} onClick={() => pickWord(w, "arranged", i)}
              className="px-3 py-1.5 rounded-lg font-medium text-sm transition-all hover:opacity-70"
              style={{ background: "var(--accent)", color: "white" }}>
              {w}
            </button>
          ))}
        </div>

        {/* Word pool */}
        <div className="flex flex-wrap gap-2 mb-4">
          {pool.map((w, i) => (
            <button key={i} onClick={() => pickWord(w, "pool", i)}
              className="px-3 py-1.5 rounded-lg font-medium text-sm border transition-all hover:border-orange-500"
              style={{ background: "var(--background)", borderColor: "var(--card-border)" }}>
              {w}
            </button>
          ))}
        </div>

        {!feedback ? (
          <button onClick={checkAnswer} disabled={arranged.length === 0}
            className="w-full py-3 rounded-xl font-semibold text-white disabled:opacity-40"
            style={{ background: "var(--accent)" }}>
            Check Order
          </button>
        ) : (
          <div>
            <div className={`p-4 rounded-xl mb-4 text-sm ${feedback.correct ? "bg-green-950 text-green-400" : "bg-red-950 text-red-400"}`}>
              {feedback.message}
            </div>
            <button onClick={nextPuzzle}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: "var(--accent)" }}>
              {idx >= PUZZLES.length - 1 ? "See Results" : "Next Puzzle →"}
            </button>
          </div>
        )}
      </div>

      <div className="text-center text-sm" style={{ color: "var(--muted)" }}>
        {idx + 1}/{PUZZLES.length} — {score.correct}/{score.total} correct
      </div>
    </main>
  );
}
