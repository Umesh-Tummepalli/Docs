import * as Y from "yjs";
import Document from "../models/documentModel.js";

const FLUSH_INTERVAL_MS = 60_000; // flush every 60 seconds

/**
 * Periodically flush modified active documents directly to MongoDB.
 *
 * saveScheduled: false → document was modified since the last save
 * saveScheduled: true  → content is in sync with DB, no save needed
 *
 * The docUpdate handler sets saveScheduled = false whenever new content
 * arrives. This loop resets it to true only after a successful DB write.
 */
const directDocumentFlush = (activeDocuments) => {
  setInterval(async () => {
    for (const [docId, state] of activeDocuments) {
      if (state.saveScheduled === false) {
        try {
          const update = Y.encodeStateAsUpdate(state.ydoc);
          await Document.findByIdAndUpdate(docId, {
            content: Buffer.from(update),
          });
          state.saveScheduled = true;
          console.log(`[flush] Document ${docId} saved to DB.`);
        } catch (err) {
          // Leave saveScheduled = false so the next tick retries.
          console.error(`[flush] Failed to save document ${docId}:`, err.message);
        }
      }
    }
  }, FLUSH_INTERVAL_MS);
};

export default directDocumentFlush;
