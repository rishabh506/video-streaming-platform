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
  connection,
});
