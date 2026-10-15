import "dotenv/config";
import * as Y from "yjs";
import { Worker } from "bullmq";
import { bullmqRedis } from "../config/redis.js";
import redis from "../config/redis.js";
import { connectMongo } from "../config/mongo.js";
import Document from "../models/documentModel.js";
import { cleanUnusedAssets } from "../utils/yDocUtils.js";

await connectMongo();

// Shared low-traffic settings
const lowTrafficOpts = {
  connection: bullmqRedis,
  // Long-poll for up to two minutes while the queue is empty. New jobs
  // wake this blocking wait immediately, so normal processing isn't delayed.
  drainDelay: 240, // seconds
  // Stalled-job check every 5 minutes instead of the 30s default.
  stalledInterval: 300000, // ms
};

// ── clean_assets worker ──────────────────────────────────────────────────────

const cleanAssetsWorker = new Worker(
  "clean_assets",
  async (job) => {
    const { docId } = job.data;

    // If the document is actively being edited, skip — a new job will be
    // scheduled when the next session ends.
    const isActive = await redis.exists(`active:doc:${docId}`);
    if (isActive) {
      console.log(`[worker] Document ${docId} is active, skipping cleanup.`);
      return;
    }

    // Load the document from MongoDB, apply it into a gc:true Y.Doc so Y.js
    // can collect deleted items, then persist the compacted state back.
    const document = await Document.findById(docId);
    if (!document) {
      console.warn(`[worker] Document ${docId} not found, skipping cleanup.`);
      return;
    }

    const gcDoc = new Y.Doc({ gc: true });
    Y.applyUpdate(gcDoc, new Uint8Array(document.content));

    const compacted = Y.encodeStateAsUpdate(gcDoc);
    await Document.findByIdAndUpdate(docId, { content: Buffer.from(compacted) });
    console.log(`[worker] GC compaction saved for document ${docId}.`);

    // Remove S3 assets that are no longer referenced in the document.
    await cleanUnusedAssets(docId);
  },
  lowTrafficOpts
);

cleanAssetsWorker.on("completed", (job) => {
  console.log(`[worker] Asset cleanup completed: ${job.data.docId}`);
});

cleanAssetsWorker.on("failed", (job, err) => {
  console.error(`[worker] Asset cleanup failed: ${job?.data?.docId}`, err.message);
});
