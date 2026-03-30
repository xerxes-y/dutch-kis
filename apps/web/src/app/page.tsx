import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-2xl">
        <h1 className="font-display text-5xl font-bold mb-4 tracking-tight">
          Dutch <span style={{ color: "var(--accent)" }}>KIS</span>
        </h1>
        <p className="text-lg mb-2" style={{ color: "var(--muted)" }}>
          Kennis. Inzicht. Spreken.
        </p>
        <p className="text-base mb-10" style={{ color: "var(--muted)" }}>
          AI-powered Dutch learning that builds your personal weakness map
          and teaches you exactly what you don&apos;t know yet.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 rounded-lg font-semibold text-white transition-opacity hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Start Learning
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 rounded-lg font-semibold border transition-opacity hover:opacity-80"
            style={{
              borderColor: "var(--card-border)",
              color: "var(--foreground)",
            }}
          >
            Sign In
          </Link>
        </div>
        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4 text-left">
          {[
            { icon: "🧠", title: "Weakness Map", desc: "Live knowledge graph across all Dutch skills" },
            { icon: "🤖", title: "AI Roleplay", desc: "Real conversations with an AI Dutch speaker" },
            { icon: "🔤", title: "Separable Verbs", desc: "Master Dutch's hardest grammar point" },
            { icon: "🔊", title: "Phonetic Studio", desc: "Perfect your Dutch g, ui, and ij sounds" },
            { icon: "📖", title: "Story Engine", desc: "Stories seeded with your weak vocabulary" },
            { icon: "📄", title: "Your Documents", desc: "Upload content — AI teaches from it" },
          ].map((f) => (
            <div
              key={f.title}
              className="p-4 rounded-xl border"
              style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <div className="font-semibold text-sm mb-1">{f.title}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                {f.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
