import type { Streak } from "@prisma/client";

interface Props {
  streak: Streak | null;
  srsCount: number;
}

export default function StatsBar({ streak, srsCount }: Props) {
  const stats = [
    { label: "Current Streak", value: streak ? `${streak.currentStreak} days` : "0 days", icon: "🔥" },
    { label: "Best Streak", value: streak ? `${streak.longestStreak} days` : "0 days", icon: "🏆" },
    { label: "Total XP", value: streak ? streak.totalXp.toLocaleString() : "0", icon: "⭐" },
    { label: "Cards Due", value: String(srsCount), icon: "🗂️" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="p-3 rounded-xl border text-center"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <div className="text-xl">{s.icon}</div>
          <div className="font-bold text-sm mt-1">{s.value}</div>
          <div className="text-xs" style={{ color: "var(--muted)" }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}
