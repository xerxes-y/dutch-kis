"use client";
import Link from "next/link";
import type { TodaysFocus } from "@/lib/smart-start";

export default function TodaysFocusCard({ focus }: { focus: TodaysFocus }) {
  return (
    <div className="flex flex-col gap-4">
      {/* SRS due */}
      {focus.srsCount > 0 && (
        <Link
          href="/srs"
          className="block p-4 rounded-xl border-2 transition-all hover:scale-[1.02]"
          style={{
            background: "var(--card)",
            borderColor: "var(--accent)",
          }}
        >
          <div className="text-2xl mb-1">🗂️</div>
          <div className="font-semibold text-sm">
            {focus.srsCount} cards due for review
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            SRS reviews first — they&apos;re time-sensitive
          </div>
        </Link>
      )}

      {/* Resume session */}
      {focus.canResume && focus.resumeContext && (
        <Link
          href={focus.resumeContext.path}
          className="block p-4 rounded-xl border transition-all hover:scale-[1.02]"
          style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
        >
          <div className="text-2xl mb-1">▶️</div>
          <div className="font-semibold text-sm">
            Resume: {focus.resumeContext.label}
          </div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            Continue where you left off
          </div>
        </Link>
      )}

      {/* Primary focus */}
      <div
        className="p-5 rounded-xl border"
        style={{ background: "var(--card)", borderColor: "var(--card-border)" }}
      >
        <div className="text-xs font-semibold uppercase tracking-widest mb-3"
          style={{ color: "var(--accent)" }}>
          Today&apos;s Focus
        </div>
        <Link
          href={focus.primary.path}
          className="block p-4 rounded-lg mb-3 transition-all hover:scale-[1.02]"
          style={{ background: "var(--background)" }}
        >
          <div className="font-bold">{focus.primary.label}</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            {focus.primary.reason}
          </div>
        </Link>

        <div className="text-xs mb-2" style={{ color: "var(--muted)" }}>
          Alternatives
        </div>
        <div className="flex flex-col gap-2">
          {focus.alternatives.map((alt) => (
            <Link
              key={alt.path}
              href={alt.path}
              className="block px-3 py-2 rounded-lg text-sm border transition-all hover:scale-[1.01]"
              style={{
                borderColor: "var(--card-border)",
                color: "var(--foreground)",
              }}
            >
              {alt.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
