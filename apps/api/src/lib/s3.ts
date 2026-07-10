import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME as string;

// Generates a presigned URL the browser can PUT the raw video file to directly.
export async function getUploadUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  // URL is valid for 15 minutes — enough time to upload a large file
  return getSignedUrl(s3, command, { expiresIn: 60 * 15 });
}

// Generates a presigned URL to read a private object (used later for HLS/thumbnails if not public)
export async function getReadUrl(key: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, command, { expiresIn: 60 * 60 });
}

export { BUCKET };
