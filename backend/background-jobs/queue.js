import { Queue } from "bullmq";
import { bullmqRedis } from "../config/redis.js";

const defaultJobOptions = {
  // Auto-remove completed jobs, keeping the last 100 for debugging.
  // This frees up the jobId in Redis so the same id can be reused on the
  // next session without BullMQ silently dropping the add.
  removeOnComplete: true,

  // Retry up to 3 times with exponential backoff (2s, 4s, 8s) before
  // giving up and moving the job to the failed set.
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 2000,
  },
};

// Queue for periodically flushing active document state to MongoDB.
export const documentSavingQueue = new Queue("document_saving", {
  connection: bullmqRedis,
  defaultJobOptions,
});

// Queue for cleaning up unused S3 assets after a session ends.
export const cleanAssetsQueue = new Queue("clean_assets", {
  connection: bullmqRedis,
  defaultJobOptions,
});

export default documentSavingQueue;
