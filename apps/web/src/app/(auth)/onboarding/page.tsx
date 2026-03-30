"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STEPS = [
  {
    id: "nativeLanguage",
    question: "What is your native language?",
    type: "select" as const,
    options: [
      { value: "en", label: "English" },
      { value: "de", label: "German" },
      { value: "tr", label: "Turkish" },
      { value: "ar", label: "Arabic" },
      { value: "fr", label: "French" },
      { value: "es", label: "Spanish" },
      { value: "other", label: "Other" },
    ],
  },
  {
    id: "learningGoal",
    question: "Why are you learning Dutch?",
    type: "select" as const,
    options: [
      { value: "inburgering", label: "🏛️ Inburgering / Citizenship Exam" },
      { value: "work", label: "💼 Work in the Netherlands" },
      { value: "family", label: "❤️ Partner or Family" },
      { value: "academic", label: "🎓 Academic Study" },
      { value: "travel", label: "✈️ Travel" },
    ],
  },
  {
    id: "cefrLevel",
    question: "How much Dutch do you already know?",
    type: "select" as const,
    options: [
      { value: "A1", label: "A1 — Complete beginner" },
      { value: "A2", label: "A2 — Basic phrases and vocabulary" },
      { value: "B1", label: "B1 — Can handle everyday situations" },
      { value: "B2", label: "B2 — Good command of Dutch" },
      { value: "C1", label: "C1 — Advanced" },
    ],
  },
  {
    id: "dailyTimeBudget",
    question: "How much time can you practice daily?",
    type: "select" as const,
    options: [
      { value: "10", label: "10 minutes — Quick daily habit" },
      { value: "20", label: "20 minutes — Regular practice" },
      { value: "30", label: "30 minutes — Committed learner" },
      { value: "60", label: "1 hour — Intensive study" },
    ],
  },
  {
    id: "correctionStyle",
    question: "How do you prefer feedback on your mistakes?",
    type: "select" as const,
    options: [
      { value: "immersive", label: "🌊 Immersive — AI silently corrects without interrupting" },
      { value: "guided", label: "💡 Guided — Show me the rule at the end of each turn" },
      { value: "explicit", label: "📚 Explicit — Stop and fully explain each mistake" },
    ],
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const current = STEPS[step]!;

  function select(value: string) {
    setAnswers((a) => ({ ...a, [current.id]: value }));
  }

  async function next() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Submit
      setLoading(true);
      await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...answers,
          dailyTimeBudget: parseInt(answers.dailyTimeBudget ?? "30"),
        }),
      });
      router.push("/dashboard");
    }
  }

  return (
    <main className="min-h-dvh flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Progress */}
        <div className="flex gap-1 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-1 rounded-full transition-all"
              style={{ background: i <= step ? "var(--accent)" : "var(--card-border)" }} />
          ))}
        </div>

        <div className="rounded-2xl border p-8"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}>
          <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--accent)" }}>
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 className="font-display text-xl font-bold mb-6">{current.question}</h2>

          <div className="flex flex-col gap-2">
            {current.options.map((opt) => (
              <button key={opt.value}
                onClick={() => select(opt.value)}
                className="w-full p-3 rounded-xl border text-left text-sm font-medium transition-all"
                style={{
                  borderColor: answers[current.id] === opt.value ? "var(--accent)" : "var(--card-border)",
                  background: answers[current.id] === opt.value ? "var(--accent-muted)" : "transparent",
                  color: answers[current.id] === opt.value ? "var(--accent)" : "var(--foreground)",
                }}>
                {opt.label}
              </button>
            ))}
          </div>

          <button
            onClick={next}
            disabled={!answers[current.id] || loading}
            className="w-full mt-6 py-3 rounded-xl font-semibold text-white disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}>
            {loading ? "Setting up…" : step < STEPS.length - 1 ? "Next →" : "Start Learning! 🚀"}
          </button>
        </div>
      </div>
    </main>
  );
}
