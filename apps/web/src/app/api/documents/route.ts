import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadDocument } from "@/lib/storage";
import { documentQueue } from "@/lib/queue";
import { randomUUID } from "crypto";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const documents = await prisma.document.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true, filename: true, status: true,
      wordCount: true, chunkCount: true, createdAt: true, mimeType: true,
    },
  });

  return NextResponse.json({ documents });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "NO_FILE" }, { status: 400 });
  }

  const ALLOWED = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "text/markdown",
    "image/png",
    "image/jpeg",
  ];

  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "UNSUPPORTED_FILE_TYPE" }, { status: 400 });
  }

  const key = `${session.user.id}/${randomUUID()}-${file.name}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadDocument(key, buffer, file.type);

  const doc = await prisma.document.create({
    data: {
      userId: session.user.id,
      filename: file.name,
      mimeType: file.type,
      minioKey: key,
      sizeBytes: file.size,
      status: "pending",
    },
  });

  // Enqueue processing job
  await documentQueue.add("process-document", {
    documentId: doc.id,
    userId: session.user.id,
  });

  return NextResponse.json({ id: doc.id, status: "pending" }, { status: 201 });
}
