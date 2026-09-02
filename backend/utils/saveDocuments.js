import * as Y from "yjs";
import { documentSavingQueue } from "../background-jobs/queue.js";

const FLUSH_INTERVAL_MS = 60_000; // flush every 60 seconds

/**
 * Periodically flush modified active documents to the document_saving queue.
 *
 * saveScheduled: false → document was modified, not yet queued for save
 * saveScheduled: true  → job is waiting/active in the queue, or no edits yet
 *
 * The docUpdate handler sets saveScheduled = false whenever new content
 * arrives. This loop sets it back to true only when a job is successfully
 * enqueued — if BullMQ deduplicates the add (job already exists in Redis),
 * we leave the flag false so the next tick retries.
 */
const eventualDocumentFlush = (activeDocuments) => {
  setInterval(async () => {
    for (const [docId, state] of activeDocuments) {
      if (state.saveScheduled === false) {
        const update = Y.encodeStateAsUpdate(state.ydoc);

        const job = await documentSavingQueue.add(
          `save-document-${docId}`,
          { docId, ydoc: Array.from(update) },
          { jobId: `save-document-${docId}` }
        );

        // If the returned job id doesn't match what we requested, BullMQ
        // deduplicated the add — leave the flag false so the next tick retries.
        if (job.id === `save-document-${docId}`) {
          state.saveScheduled = true;
        } else {
          console.warn(`[flush] Job add deduplicated for ${docId}, will retry next tick.`);
        }
      }
    }
  }, FLUSH_INTERVAL_MS);
};

export default eventualDocumentFlush;
