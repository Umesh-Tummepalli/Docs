import "dotenv/config";
import { Worker } from "bullmq";
import { bullmqRedis } from "../config/redis.js";
import * as Y from "yjs";
import { connectMongo } from "../config/mongo.js";
import Document from "../models/documentModel.js";
import { cleanUnusedAssets } from "../utils/yDocUtils.js";

await connectMongo();

// ── document_saving worker ───────────────────────────────────────────────────

const documentSavingWorker = new Worker(
  "document_saving",
  async (job) => {
    const { docId, ydoc: encodedYdoc } = job.data;
    const update = new Uint8Array(encodedYdoc);
    await Document.findByIdAndUpdate(docId, {
      content: Buffer.from(update),
    });
  },
  {
    connection: bullmqRedis,
  }
);

documentSavingWorker.on("completed", (job) => {
  console.log(`[worker] Document saved: ${job.data.docId}`);
});

documentSavingWorker.on("failed", (job, err) => {
  console.error(`[worker] Document save failed: ${job?.data?.docId}`, err.message);
});

// ── clean_assets worker ──────────────────────────────────────────────────────

const cleanAssetsWorker = new Worker(
  "clean_assets",
  async (job) => {
    const { docId } = job.data;
    await cleanUnusedAssets(docId);
  },
  {
    connection: bullmqRedis,
  }
);

cleanAssetsWorker.on("completed", (job) => {
  console.log(`[worker] Asset cleanup completed: ${job.data.docId}`);
});

cleanAssetsWorker.on("failed", (job, err) => {
  console.error(`[worker] Asset cleanup failed: ${job?.data?.docId}`, err.message);
});
