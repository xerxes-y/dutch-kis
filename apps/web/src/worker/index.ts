import { Worker, connection } from "@/lib/queue";
import type { DocumentJobData, MemoryJobData } from "@/lib/queue";
import { prisma } from "@/lib/prisma";
import { embed } from "@/lib/ollama";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import type { Readable } from "stream";

const s3 = new S3Client({
  region: "us-east-1",
  endpoint: `http://${process.env.MINIO_ENDPOINT ?? "minio"}:${process.env.MINIO_PORT ?? "9000"}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "dutch_kis",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "dutch_kis_minio_secret",
  },
});

// Document processing worker
new Worker<DocumentJobData>(
  "documents",
  async (job) => {
    const { documentId, userId } = job.data;

    await prisma.document.update({
      where: { id: documentId },
      data: { status: "indexing" },
    });

    try {
      // Fetch file from MinIO
      const doc = await prisma.document.findUnique({ where: { id: documentId } });
      if (!doc) throw new Error("Document not found");

      const obj = await s3.send(
        new GetObjectCommand({ Bucket: "documents", Key: doc.minioKey })
      );

      const stream = obj.Body as Readable;
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk as Buffer);
      }
      const buffer = Buffer.concat(chunks);

      // Extract text based on MIME type
      let text = "";
      if (doc.mimeType === "text/plain" || doc.mimeType === "text/markdown") {
        text = buffer.toString("utf-8");
      } else if (doc.mimeType === "application/pdf") {
        const pdf = await import("pdf-parse");
        const result = await pdf.default(buffer);
        text = result.text;
      } else if (doc.mimeType.includes("wordprocessingml")) {
        const mammoth = await import("mammoth");
        const result = await mammoth.extractRawText({ buffer });
        text = result.value;
      } else {
        // For images, use Tesseract
        const Tesseract = await import("tesseract.js");
        const worker = await Tesseract.createWorker("nld"); // Dutch
        const { data } = await worker.recognize(buffer);
        text = data.text;
        await worker.terminate();
      }

      if (!text.trim()) {
        throw new Error("No text extracted from document");
      }

      // Chunk the text
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 500,
        chunkOverlap: 50,
      });
      const textChunks = await splitter.splitText(text);

      // Embed and store chunks
      let position = 0;
      for (const chunk of textChunks) {
        const embedding = await embed(chunk);
        const vectorLiteral = `[${embedding.join(",")}]`;

        await prisma.$executeRawUnsafe(
          `INSERT INTO "DocumentChunk" (id, "createdAt", "documentId", content, position, embedding)
           VALUES (gen_random_uuid(), now(), $1, $2, $3, $4::vector)`,
          documentId,
          chunk,
          position,
          vectorLiteral
        );
        position++;
      }

      const wordCount = text.split(/\s+/).length;

      await prisma.document.update({
        where: { id: documentId },
        data: { status: "ready", wordCount, chunkCount: textChunks.length },
      });
    } catch (err) {
      await prisma.document.update({
        where: { id: documentId },
        data: {
          status: "error",
          errorMessage: err instanceof Error ? err.message : "Unknown error",
        },
      });
      throw err;
    }
  },
  { connection }
);

// Session memory worker
new Worker<MemoryJobData>(
  "session-memory",
  async (job) => {
    const { userId, sessionId, summary } = job.data;
    const embedding = await embed(summary);
    const vectorLiteral = `[${embedding.join(",")}]`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SessionMemory" (id, "createdAt", "userId", "sessionId", summary, embedding)
       VALUES (gen_random_uuid(), now(), $1, $2, $3, $4::vector)
       ON CONFLICT ("sessionId") DO UPDATE SET summary = $3, embedding = $4::vector`,
      userId,
      sessionId,
      summary,
      vectorLiteral
    );
  },
  { connection }
);

console.log("🔧 Worker started: documents + session-memory queues");
