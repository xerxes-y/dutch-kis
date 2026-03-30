import { Queue, Worker, type Job } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

export const documentQueue = new Queue("documents", { connection });
export const emailQueue = new Queue("emails", { connection });
export const memoryQueue = new Queue("session-memory", { connection });

export type DocumentJobData = {
  documentId: string;
  userId: string;
};

export type EmailJobData = {
  to: string;
  subject: string;
  html: string;
};

export type MemoryJobData = {
  userId: string;
  sessionId: string;
  summary: string;
};

export { Worker, type Job, connection };
