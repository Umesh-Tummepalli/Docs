import jwt from "jsonwebtoken";
import { io } from "../main.js";
import * as Y from "yjs";
import fs from "fs";

import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import Document from "../models/documentModel.js";
import { extractImagesFromYDoc, cleanUnusedAssets } from "../utils/yDocUtils.js";

// docId → { ydoc: Y.Doc, awareness: Awareness }
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
    // Populated incrementally as awarenessUpdate events come in.
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

        documentState = { ydoc, awareness };
        activeDocuments.set(docId, documentState);
      }

      const { ydoc, awareness } = documentState;

      socket.join(docId);

      // ── Send current Y.Doc state ──────────────────────────────────────────
      socket.emit("docSync", Y.encodeStateAsUpdate(ydoc));

      // ── Send existing awareness states to the newly joined client ─────────
      // This lets the new client immediately see cursors that are already active.
      const existingClientIds = Array.from(awareness.getStates().keys());
      if (existingClientIds.length > 0) {
        const awarenessUpdate = encodeAwarenessUpdate(awareness, existingClientIds);
        // Socket.IO will serialise Uint8Array as binary — client receives it as-is.
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
    // Use server-verified docId and accessLevel — never trust client payload.
    const { docId, accessLevel } = socket.data;
    if (!docId || accessLevel === "read") return;

    const documentState = activeDocuments.get(docId);
    if (!documentState) return;

    // data is a raw byte array (Array<number>) sent by the client.
    Y.applyUpdate(documentState.ydoc, new Uint8Array(data));

    // Broadcast raw bytes to everyone else in the room.
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

    // Snapshot the known clientIds before applying so we can detect new ones.
    const knownBefore = new Set(awareness.getStates().keys());

    // Apply to the server's in-memory Awareness — keeps the server state
    // authoritative for newly joining clients.
    applyAwarenessUpdate(awareness, new Uint8Array(data), socket);

    // Track any new clientIds that appeared in this update so we can clean
    // them up correctly when this socket disconnects.
    for (const clientId of awareness.getStates().keys()) {
      if (!knownBefore.has(clientId)) {
        socket.data.awarenessClientIds.add(clientId);
      }
    }

    // Broadcast raw bytes to everyone else in the room.
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

      // Remove this client's cursor state from the server's Awareness.
      removeAwarenessStates(awareness, clientIds, "disconnect");

      // Broadcast the removal so other clients hide the departed cursor(s).
      const removalUpdate = encodeAwarenessUpdate(awareness, clientIds);
      socket.to(docId).emit("awarenessUpdate", removalUpdate);
    }

    // Remove Y.Doc + Awareness from memory when the room is empty,
    // then call the hook so you can add persistence logic later.
    const room = io.sockets.adapter.rooms.get(docId);
    if (!room || room.size === 0) {
      const finalState = activeDocuments.get(docId);
      activeDocuments.delete(docId);
      console.log(`Cleaned up collaboration state for ${docId}`);

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
// Persists the final Y.Doc state and removes any assets that were deleted
// during the session (S3 object + DocumentAsset record).
async function onRoomEmpty(docId, ydoc) {
  try {
    // 1. Persist the final Y.Doc state back to MongoDB.
    const update = Y.encodeStateAsUpdate(ydoc);
    await Document.findByIdAndUpdate(docId, { content: Buffer.from(update) });

    // 2. Remove any S3 objects + DB records for assets no longer in the document.
    await cleanUnusedAssets(docId, ydoc);
  } catch (err) {
    console.error(`onRoomEmpty failed for ${docId}:`, err);
  }
}
