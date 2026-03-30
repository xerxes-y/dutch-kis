import Link from "next/link";

const MODES = [
  { path: "/freewrite",  icon: "✍️",  title: "Free Write",          desc: "Write Dutch freely — AI corrects" },
  { path: "/roleplay",   icon: "🎭",  title: "Roleplay",            desc: "Conversation scenarios" },
  { path: "/dehet",      icon: "🔤",  title: "De/Het Oracle",       desc: "Master Dutch articles" },
  { path: "/separable",  icon: "🔀",  title: "Separable Verbs",     desc: "opbellen → Ik bel op" },
  { path: "/wordorder",  icon: "🧩",  title: "Word Order",          desc: "V2 rule & subordinate clauses" },
  { path: "/story",      icon: "📖",  title: "Story Engine",        desc: "AI stories with your vocabulary" },
  { path: "/phonetic",   icon: "🔊",  title: "Phonetic Studio",     desc: "Perfect Dutch sounds" },
  { path: "/srs",        icon: "🗂️",  title: "SRS Deck",            desc: "Spaced repetition review" },
  { path: "/documents",  icon: "📄",  title: "Document Library",    desc: "Upload & learn from your files" },
];

export default function ModeGrid() {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
    >
      <h2 className="font-display font-semibold text-lg mb-4">Learning Modes</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {MODES.map((m) => (
          <Link
            key={m.path}
            href={m.path}
            className="p-3 rounded-xl border transition-all hover:scale-[1.02] hover:border-orange-500"
            style={{
              background: "var(--background)",
              borderColor: "var(--card-border)",
            }}
          >
            <div className="text-xl mb-1">{m.icon}</div>
            <div className="font-semibold text-sm">{m.title}</div>
            <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
              {m.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
