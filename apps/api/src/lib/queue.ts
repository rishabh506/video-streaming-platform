import { Queue } from "bullmq";
import IORedis from "ioredis";

export const connection = new IORedis(process.env.REDIS_URL as string, {
  maxRetriesPerRequest: null, // required by BullMQ
});

export interface TranscodeJobData {
  videoId: string;
  rawKey: string;
}

export const transcodeQueue = new Queue<TranscodeJobData>("transcode", {
  connection: connection as any, // BullMQ's ConnectionOptions type and ioredis's Redis type
  // can drift out of sync across versions; casting avoids a false-positive TS error here.
});