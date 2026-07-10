import "dotenv/config";
import fs from "fs";
import path from "path";
import os from "os";
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { downloadFromS3, uploadDirToS3, uploadToS3 } from "./lib/s3";
import { transcodeToHls, generateThumbnail, getDuration } from "./transcode";
import { markVideoReady, markVideoFailed } from "./lib/db";

const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null,
});

interface TranscodeJobData {
  videoId: string;
  rawKey: string;
}

async function processJob(job: Job<TranscodeJobData>) {
  const { videoId, rawKey } = job.data;
  console.log(`[worker] Starting transcode for video ${videoId}`);

  // Create an isolated temp working directory for this job
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), `vsp-${videoId}-`));
  const rawExt = path.extname(rawKey) || ".mp4";
  const rawLocalPath = path.join(workDir, `raw${rawExt}`);
  const hlsOutputDir = path.join(workDir, "hls");
  fs.mkdirSync(hlsOutputDir, { recursive: true });

  try {
    console.log(`[worker] Downloading ${rawKey}...`);
    await downloadFromS3(rawKey, rawLocalPath);

    console.log(`[worker] Probing duration...`);
    const durationSec = await getDuration(rawLocalPath);

    console.log(`[worker] Generating thumbnail...`);
    const thumbnailLocalPath = await generateThumbnail(rawLocalPath, workDir);

    console.log(`[worker] Transcoding to HLS (this can take a while)...`);
    await transcodeToHls(rawLocalPath, hlsOutputDir);

    const s3Prefix = `videos/${videoId}`;
    console.log(`[worker] Uploading HLS output to s3://${s3Prefix}/hls ...`);
    await uploadDirToS3(hlsOutputDir, `${s3Prefix}/hls`);

    console.log(`[worker] Uploading thumbnail...`);
    const thumbnailKey = `${s3Prefix}/thumbnail.jpg`;
    await uploadToS3(thumbnailLocalPath, thumbnailKey, "image/jpeg");

    const hlsMasterKey = `${s3Prefix}/hls/master.m3u8`;
    const thumbnailUrl = `${process.env.PUBLIC_S3_BASE_URL}/${thumbnailKey}`;

    await markVideoReady(videoId, hlsMasterKey, durationSec, thumbnailUrl);
    console.log(`[worker] Video ${videoId} is READY.`);
  } catch (err) {
    console.error(`[worker] Failed to transcode video ${videoId}:`, err);
    await markVideoFailed(videoId);
    throw err;
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

const worker = new Worker<TranscodeJobData>("transcode", processJob, {
  connection,
  concurrency: 1, // transcodes are CPU-heavy; raise this only if your machine can handle parallel FFmpeg jobs
});

worker.on("completed", (job) => {
  console.log(`[worker] Job ${job.id} completed.`);
});

worker.on("failed", (job, err) => {
  console.error(`[worker] Job ${job?.id} failed:`, err.message);
});

console.log("Transcode worker started, waiting for jobs...");
