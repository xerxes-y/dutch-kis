import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getWeaknessMap } from "@/lib/weakness-map";
import { getTodaysFocus } from "@/lib/smart-start";
import WeaknessMapChart from "@/components/weakness-map/WeaknessMapChart";
import TodaysFocusCard from "@/components/weakness-map/TodaysFocusCard";
import StatsBar from "@/components/weakness-map/StatsBar";
import ModeGrid from "@/components/weakness-map/ModeGrid";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const userId = session.user.id;

  if (!(await prisma.user.findUnique({ where: { id: userId }, select: { onboardingDone: true } }))?.onboardingDone) {
    redirect("/onboarding");
  }

  const [scores, focus, streak, srsCount] = await Promise.all([
    getWeaknessMap(userId),
    getTodaysFocus(userId),
    prisma.streak.findUnique({ where: { userId } }),
    prisma.vocabulary.count({ where: { userId, fsrsDue: { lte: new Date() } } }),
  ]);

  return (
    <main className="min-h-dvh p-4 md:p-8 max-w-5xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Goedemorgen, {session.user.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Your Dutch DNA — where you are today
          </p>
        </div>
        <div className="flex items-center gap-3">
          {streak && (
            <div
              className="flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              🔥 {streak.currentStreak} day streak
            </div>
          )}
        </div>
      </header>

      <div className="grid md:grid-cols-[1fr_300px] gap-6">
        <div className="flex flex-col gap-6">
          <StatsBar streak={streak} srsCount={srsCount} />
          <WeaknessMapChart scores={scores} />
          <ModeGrid />
        </div>
        <div>
          <TodaysFocusCard focus={focus} />
        </div>
      </div>
    </main>
  );
}
