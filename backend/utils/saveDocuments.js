import * as Y from "yjs";
import Document from "../models/documentModel.js";

const FLUSH_INTERVAL_MS = 60_000; // flush every 60 seconds

/**
 * Periodically flush modified active documents directly to MongoDB using bulk operations.
 *
 * saveScheduled: false → document was modified since the last save
 * saveScheduled: true  → content is in sync with DB, no save needed
 *
 * The docUpdate handler sets saveScheduled = false whenever new content
 * arrives. This loop resets it to true only after a successful DB write.
 *
 * This implementation uses bulkWrite to batch all updates into a single
 * MongoDB query, significantly reducing server load and improving throughput.
 */
const directDocumentFlush = (activeDocuments) => {
  setInterval(async () => {
    // Collect all documents that need to be flushed
    const documentsToFlush = [];
    
    for (const [docId, state] of activeDocuments) {
      if (state.saveScheduled === false) {
        try {
          const update = Y.encodeStateAsUpdate(state.ydoc);
          documentsToFlush.push({
            docId,
            content: Buffer.from(update),
            state,
          });
        } catch (err) {
          console.error(`[flush] Failed to encode document ${docId}:`, err.message);
        }
      }
    }

    // If there are no documents to flush, skip this cycle
    if (documentsToFlush.length === 0) {
      return;
    }

    // Prepare bulk write operations
    const bulkOps = documentsToFlush.map(({ docId, content }) => ({
      updateOne: {
        filter: { _id: docId },
        update: { $set: { content } },
      },
    }));

    try {
      // Execute all updates in a single bulk operation
      const result = await Document.bulkWrite(bulkOps, { ordered: false });
      
      // Mark all successfully flushed documents as saved
      documentsToFlush.forEach(({ docId, state }) => {
        state.saveScheduled = true;
      });
      
      console.log(`[flush] Successfully saved ${result.modifiedCount} documents to DB in batch.`);
    } catch (err) {
      // On bulk write error, keep saveScheduled = false for all documents
      // so they'll be retried in the next cycle
      console.error(`[flush] Bulk write failed:`, err.message);
      
      // Optional: Try to identify which specific documents failed if needed
      if (err.writeErrors) {
        err.writeErrors.forEach((writeError) => {
          const failedOp = bulkOps[writeError.index];
          console.error(`[flush] Failed to save document ${failedOp.updateOne.filter._id}`);
        });
      }
    }
  }, FLUSH_INTERVAL_MS);
};

export default directDocumentFlush;
