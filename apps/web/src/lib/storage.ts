import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const client = new S3Client({
  region: "us-east-1",
  endpoint: `http://${process.env.MINIO_ENDPOINT ?? "localhost"}:${process.env.MINIO_PORT ?? "9000"}`,
  forcePathStyle: true,
  credentials: {
    accessKeyId: process.env.MINIO_ROOT_USER ?? "dutch_kis",
    secretAccessKey: process.env.MINIO_ROOT_PASSWORD ?? "dutch_kis_minio_secret",
  },
});

const DOCUMENTS_BUCKET = process.env.MINIO_BUCKET_DOCUMENTS ?? "documents";
const AUDIO_BUCKET = process.env.MINIO_BUCKET_AUDIO ?? "audio-recordings";

export async function uploadDocument(
  key: string,
  body: Buffer,
  contentType: string
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: DOCUMENTS_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function uploadAudio(
  key: string,
  body: Buffer,
  contentType = "audio/webm"
): Promise<void> {
  await client.send(
    new PutObjectCommand({
      Bucket: AUDIO_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
}

export async function getDocumentSignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key }),
    { expiresIn }
  );
}

export async function deleteDocument(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({ Bucket: DOCUMENTS_BUCKET, Key: key })
  );
}
