import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const AddSchema = z.object({
  word: z.string().min(1).max(200),
  lemma: z.string().min(1).max(200),
  translation: z.string().optional(),
  gender: z.enum(["de", "het"]).optional(),
  cefrLevel: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional(),
  domain: z.enum(["work", "family", "travel", "academic", "daily"]).optional(),
  pos: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const due = searchParams.get("due") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50"), 100);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const where = {
    userId: session.user.id,
    ...(due ? { fsrsDue: { lte: new Date() } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.vocabulary.findMany({
      where,
      orderBy: due ? { fsrsDue: "asc" } : { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.vocabulary.count({ where }),
  ]);

  return NextResponse.json({ items, total });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = AddSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "INVALID_INPUT" }, { status: 400 });
  }

  const vocab = await prisma.vocabulary.upsert({
    where: {
      userId_lemma: {
        userId: session.user.id,
        lemma: body.data.lemma.toLowerCase(),
      },
    },
    create: {
      userId: session.user.id,
      word: body.data.word,
      lemma: body.data.lemma.toLowerCase(),
      translation: body.data.translation,
      gender: body.data.gender,
      cefrLevel: body.data.cefrLevel ?? "A1",
      domain: body.data.domain,
      pos: body.data.pos,
    },
    update: {
      translation: body.data.translation,
      gender: body.data.gender,
    },
  });

  return NextResponse.json(vocab, { status: 201 });
}
