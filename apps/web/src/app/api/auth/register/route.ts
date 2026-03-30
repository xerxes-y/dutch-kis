import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { initWeaknessMap } from "@/lib/weakness-map";

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});

export async function POST(req: NextRequest) {
  const body = RegisterSchema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json(
      { error: "INVALID_INPUT", issues: body.error.issues },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({
    where: { email: body.data.email },
  });
  if (existing) {
    return NextResponse.json(
      { error: "EMAIL_TAKEN" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(body.data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: body.data.email,
      name: body.data.name,
      passwordHash,
    },
  });

  await initWeaknessMap(user.id, null);

  return NextResponse.json({ id: user.id, email: user.email }, { status: 201 });
}
