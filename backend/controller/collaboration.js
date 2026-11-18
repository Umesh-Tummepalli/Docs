import jwt from "jsonwebtoken";
import { io } from "../main.js";
import * as Y from "yjs";
import redis from "../config/redis.js";

import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import Document from "../models/documentModel.js";
import DocumentAccess from "../models/documentAccessModel.js";
import DocumentAccessToken from "../models/documentAccessToken.js";
import directDocumentFlush from "../utils/saveDocuments.js";
import { registerDocumentUser, unregisterDocumentUser, syncDocumentUserAccess, clearDocumentAccessRegistry } from "../utils/collaborationAccess.js";
import { cleanUnusedAssets } from "../utils/yDocUtils.js";

// docId → { ydoc: Y.Doc, awareness: Awareness, saveScheduled: boolean, hasLocalChanges: boolean }
const activeDocuments = new Map();

// ── Auth middleware ──────────────────────────────────────────────────────────

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.userId;
    socket.data.docId = payload.docId;
    socket.data.accessLevel = payload.accessLevel;
    socket.data.accessToken = payload.accessToken || null;
    if (!socket.data.docId) throw new Error("Invalid collaboration token");
    if (!socket.data.accessToken && !socket.data.userId) throw new Error("Invalid collaboration token");
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

        const ydoc = new Y.Doc({ gc: false });
        if (doc.content?.length) {
          Y.applyUpdate(ydoc, new Uint8Array(doc.content));
        }

        // One Awareness instance per document, shared by all sockets in the room.
        const awareness = new Awareness(ydoc);
        // Seed the per-document access registry from MongoDB when the room starts.
        const accessRows = await DocumentAccess.find({ documentId: docId }).select('userId accessLevel').lean();
        for (const row of accessRows) registerDocumentUser(docId, row.userId, row.accessLevel);

        // saveScheduled: true → content matches DB, no flush needed yet.
        // It is flipped to false whenever a docUpdate arrives.
        // hasLocalChanges: true → document was modified since loaded from DB
        documentState = { ydoc, awareness, saveScheduled: true, hasLocalChanges: false };
        activeDocuments.set(docId, documentState);
      }

      // Re-read MongoDB permission at join time; JWT access is only a hint.
      let currentAccess = null;
      if (socket.data.accessToken) {
        const accessToken = await DocumentAccessToken.findOne({ token: socket.data.accessToken, documentId: docId }).lean();
        if (!accessToken) return socket.emit('error', 'Invalid document access token');
        socket.data.accessLevel = accessToken.accessLevel;
      } else {
        currentAccess = await DocumentAccess.findOne({ documentId: docId, userId: socket.data.userId }).lean();
        if (!currentAccess) return socket.emit("error", "Access revoked");
        socket.data.accessLevel = currentAccess.accessLevel;
        registerDocumentUser(docId, socket.data.userId, currentAccess.accessLevel, socket);
      }

      // Track this user as an active participant in the document.
      await redis.sadd(`active:doc:${docId}`, socket.data.userId);

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

  socket.on("docUpdate", async (data) => {
    const { docId } = socket.data;
    if (!docId) return;

    const documentState = activeDocuments.get(docId);
    if (!documentState) return;
    const currentAccess = socket.data.accessToken
      ? await DocumentAccessToken.findOne({ token: socket.data.accessToken, documentId: docId }).lean()
      : await DocumentAccess.findOne({ documentId: docId, userId: socket.data.userId }).lean();
    if (!currentAccess || !['owner', 'write'].includes(currentAccess.accessLevel)) {
      socket.data.accessLevel = currentAccess?.accessLevel || null;
      return socket.emit('error', 'Write access required');
    }
    socket.data.accessLevel = currentAccess.accessLevel;

    Y.applyUpdate(documentState.ydoc, new Uint8Array(data));

    // Mark as modified so the next flush cycle picks it up.
    documentState.saveScheduled = false;
    // Track that document was actually modified since loaded
    documentState.hasLocalChanges = true;

    // Broadcast to everyone else in the room.
    socket.to(docId).emit("docUpdate", data);
  });

  // ─────────────────────────────────────────
  // AWARENESS UPDATE
  // ─────────────────────────────────────────

  socket.on("awarenessUpdate", async (data) => {
    const { docId } = socket.data;
    if (!docId) return;
    const currentAccess = socket.data.accessToken
      ? await DocumentAccessToken.findOne({ token: socket.data.accessToken, documentId: docId }).lean()
      : await DocumentAccess.findOne({ documentId: docId, userId: socket.data.userId }).lean();
    if (!currentAccess) return socket.emit('error', 'Access revoked');
    socket.data.accessLevel = currentAccess.accessLevel;

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
    unregisterDocumentUser(docId, socket.data.userId, socket);

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
      clearDocumentAccessRegistry(docId);
      if (finalState && finalState.hasLocalChanges) {
        await onRoomEmpty(docId, finalState.ydoc).catch((err) =>
          console.error(`onRoomEmpty failed for ${docId}:`, err)
        );
      } else if (finalState) {
        // No local changes, just clean up Redis
        await redis.del(`active:doc:${docId}`);
        console.log(`[onRoomEmpty] Document ${docId} marked inactive (no changes).`);
      }
    } else {
      // Room still has users — remove only this user from the active set.
      await redis.srem(`active:doc:${docId}`, socket.data.userId);
    }
  });
});

// ── Room-empty hook ──────────────────────────────────────────────────────────
// Called once when the last connection leaves a document room.
//   1. GC-compact the Y.Doc and save the clean state to MongoDB.
//   2. Clear the active-document flag in Redis.
//   3. Delete unused S3 assets inline.
async function onRoomEmpty(docId, ydoc) {
  // 1. Apply the in-memory doc into a gc:true Y.Doc so deleted items are
  //    collected, then persist the compacted state to MongoDB.
  const gcDoc = new Y.Doc({ gc: true });
  Y.applyUpdate(gcDoc, Y.encodeStateAsUpdate(ydoc));
  const compacted = Y.encodeStateAsUpdate(gcDoc);
  await Document.findByIdAndUpdate(docId, { content: Buffer.from(compacted) });
  console.log(`[onRoomEmpty] Document ${docId} GC-compacted and saved to DB.`);

  // 2. Clear the active-document flag so new collab tokens can be issued.
  await redis.del(`active:doc:${docId}`);
  console.log(`[onRoomEmpty] Document ${docId} marked inactive.`);

  // 3. Remove S3 assets no longer referenced in the document.
  await cleanUnusedAssets(docId);
  console.log(`[onRoomEmpty] Asset cleanup done for ${docId}.`);
}

// Start the periodic flush loop for all active documents.
directDocumentFlush(activeDocuments);
