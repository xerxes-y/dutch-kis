import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWeaknessMap } from "@/lib/weakness-map";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const scores = await getWeaknessMap(session.user.id);
  return NextResponse.json({ scores });
}

export async function GET_SNAPSHOTS(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "30"), 90);

  const snapshots = await prisma.weaknessMapSnapshot.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { createdAt: true, scores: true },
  });

  return NextResponse.json({ snapshots });
}
