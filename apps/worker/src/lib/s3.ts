import fs from "fs";
import path from "path";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const BUCKET = process.env.S3_BUCKET_NAME as string;

// Downloads a single object from S3 to a local file path.
export async function downloadFromS3(key: string, destPath: string) {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const response = await s3.send(command);
  const body = response.Body as NodeJS.ReadableStream;

  await new Promise<void>((resolve, reject) => {
    const writeStream = fs.createWriteStream(destPath);
    body.pipe(writeStream);
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
  });
}

// Uploads a single file to S3.
export async function uploadToS3(localPath: string, key: string, contentType: string) {
  const fileBuffer = fs.readFileSync(localPath);
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });
  await s3.send(command);
}

// Recursively uploads every file in a local directory to S3 under a given prefix.
export async function uploadDirToS3(localDir: string, s3Prefix: string) {
  const entries = fs.readdirSync(localDir, { withFileTypes: true });

  for (const entry of entries) {
    const localPath = path.join(localDir, entry.name);
    const s3Key = `${s3Prefix}/${entry.name}`;

    if (entry.isDirectory()) {
      await uploadDirToS3(localPath, s3Key);
    } else {
      const contentType = entry.name.endsWith(".m3u8")
        ? "application/vnd.apple.mpegurl"
        : entry.name.endsWith(".ts")
        ? "video/MP2T"
        : entry.name.endsWith(".jpg")
        ? "image/jpeg"
        : "application/octet-stream";
      await uploadToS3(localPath, s3Key, contentType);
    }
  }
}
