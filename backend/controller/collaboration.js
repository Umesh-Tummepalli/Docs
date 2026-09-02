import jwt from "jsonwebtoken";
import { io } from "../main.js";
import * as Y from "yjs";

import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import Document from "../models/documentModel.js";
import eventualDocumentFlush from "../utils/saveDocuments.js";
import { documentSavingQueue, cleanAssetsQueue } from "../background-jobs/queue.js";

// docId → { ydoc: Y.Doc, awareness: Awareness, saveScheduled: boolean }
const activeDocuments = new Map();

// ── Auth middleware ──────────────────────────────────────────────────────────

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.userId;
    socket.data.docId = payload.docId;
    socket.data.accessLevel = payload.accessLevel;
    // Set of Y.js clientIDs whose awareness state arrived via this socket.
    socket.data.awarenessClientIds = new Set();
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// ── Connection ───────────────────────────────────────────────────────────────

io.on("connection", (socket) => {

  // ─────────────────────────────────────────
  // JOIN ROOM
  // ─────────────────────────────────────────

  socket.on("joinDocRoom", async (docId) => {
    try {
      // Only allow joining the room the token was issued for.
      if (socket.data.docId !== docId) {
        return socket.emit("error", "Access denied");
      }

      let documentState = activeDocuments.get(docId);

      if (!documentState) {
        const doc = await Document.findById(docId);
        if (!doc) return socket.emit("error", "Document not found");

        const ydoc = new Y.Doc();
        if (doc.content?.length) {
          Y.applyUpdate(ydoc, new Uint8Array(doc.content));
        }

        // One Awareness instance per document, shared by all sockets in the room.
        const awareness = new Awareness(ydoc);

        // saveScheduled: true → content matches DB, no flush needed yet.
        // It is flipped to false whenever a docUpdate arrives.
        documentState = { ydoc, awareness, saveScheduled: true };
        activeDocuments.set(docId, documentState);
      }

      const { ydoc, awareness } = documentState;

      socket.join(docId);

      // ── Send current Y.Doc state ──────────────────────────────────────────
      socket.emit("docSync", Y.encodeStateAsUpdate(ydoc));

      // ── Send existing awareness states to the newly joined client ─────────
      const existingClientIds = Array.from(awareness.getStates().keys());
      if (existingClientIds.length > 0) {
        const awarenessUpdate = encodeAwarenessUpdate(awareness, existingClientIds);
        socket.emit("awarenessUpdate", awarenessUpdate);
      }

    } catch (error) {
      console.error("Error joining document:", error);
    }
  });

  // ─────────────────────────────────────────
  // Y.DOC UPDATE
  // ─────────────────────────────────────────

  socket.on("docUpdate", (data) => {
    const { docId, accessLevel } = socket.data;
    if (!docId || accessLevel === "read") return;

    const documentState = activeDocuments.get(docId);
    if (!documentState) return;

    Y.applyUpdate(documentState.ydoc, new Uint8Array(data));

    // Mark as modified so the next flush cycle picks it up.
    documentState.saveScheduled = false;

    // Broadcast to everyone else in the room.
    socket.to(docId).emit("docUpdate", data);
  });

  // ─────────────────────────────────────────
  // AWARENESS UPDATE
  // ─────────────────────────────────────────

  socket.on("awarenessUpdate", (data) => {
    const { docId } = socket.data;
    if (!docId) return;

    const documentState = activeDocuments.get(docId);
    if (!documentState) return;

    const { awareness } = documentState;

    const knownBefore = new Set(awareness.getStates().keys());

    applyAwarenessUpdate(awareness, new Uint8Array(data), socket);

    for (const clientId of awareness.getStates().keys()) {
      if (!knownBefore.has(clientId)) {
        socket.data.awarenessClientIds.add(clientId);
      }
    }

    socket.to(docId).emit("awarenessUpdate", data);
  });

  // ─────────────────────────────────────────
  // DISCONNECT
  // ─────────────────────────────────────────

  socket.on("disconnect", async () => {
    const { docId, awarenessClientIds } = socket.data;
    if (!docId) return;

    const documentState = activeDocuments.get(docId);
    if (documentState && awarenessClientIds?.size > 0) {
      const { awareness } = documentState;
      const clientIds = Array.from(awarenessClientIds);

      removeAwarenessStates(awareness, clientIds, "disconnect");

      const removalUpdate = encodeAwarenessUpdate(awareness, clientIds);
      socket.to(docId).emit("awarenessUpdate", removalUpdate);
    }

    // If the room is now empty, save the final state and schedule cleanup.
    const room = io.sockets.adapter.rooms.get(docId);
    if (!room || room.size === 0) {
      const finalState = activeDocuments.get(docId);
      activeDocuments.delete(docId);
      if (finalState) {
        await onRoomEmpty(docId, finalState.ydoc).catch((err) =>
          console.error(`onRoomEmpty failed for ${docId}:`, err)
        );
      }
    }
  });
});

// ── Room-empty hook ──────────────────────────────────────────────────────────
// Called once when the last connection leaves a document room.
//   1. Cancel any pending periodic flush job for this document.
//   2. Save the final Y.Doc state directly to MongoDB (immediate, authoritative).
//   3. Schedule a clean_assets job so unused S3 objects are purged asynchronously.
async function onRoomEmpty(docId, ydoc) {
  // 1. Remove the periodic flush job if it is still waiting — we are about
  //    to do a definitive save, so running it later would be redundant.
  try {
    const pendingJob = await documentSavingQueue.getJob(`save-document-${docId}`);
    if (pendingJob) {
      await pendingJob.remove();
    }
  } catch (err) {
    // Non-fatal — if the job can't be removed it will just run and overwrite
    // with the same data.
    console.warn(`[onRoomEmpty] Could not remove pending save job for ${docId}:`, err.message);
  }

  // 2. Persist the definitive final state synchronously before we lose the
  //    in-memory ydoc reference.
  const update = Y.encodeStateAsUpdate(ydoc);
  await Document.findByIdAndUpdate(docId, { content: Buffer.from(update) });
  console.log(`[onRoomEmpty] Document ${docId} saved to DB.`);


  // 3. Schedule the asset-cleanup job asynchronously.
  //    jobId deduplication prevents double-scheduling if two sockets somehow
  //    trigger onRoomEmpty at the same time. removeOnComplete on the queue
  //    ensures completed jobs are cleaned up so the jobId can be reused on
  //    the next session for the same document.
  await cleanAssetsQueue.add(
    `clean-assets-${docId}`,
    { docId },
    { jobId: `clean-assets-${docId}` }
  );
  console.log(`[onRoomEmpty] Asset cleanup job queued for ${docId}.`);
}

// Start the periodic flush loop for all active documents.
eventualDocumentFlush(activeDocuments);
