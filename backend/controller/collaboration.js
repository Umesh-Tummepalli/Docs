import jwt from "jsonwebtoken";
import { io } from "../main.js";
import * as Y from "yjs";

const activeDocuments = new Map(); // docId → Y.Doc

// ── Auth middleware ──────────────────────────────────────────────────────────
// Verifies the collaboration JWT (issued by giveDocumentAccess).
// Token carries docId, userId, and accessLevel — no extra DB call needed.
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.data.userId = payload.userId;
    socket.data.docId = payload.docId;
    socket.data.accessLevel = payload.accessLevel;
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

// ── Connection ───────────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("joinDocRoom", async (docId) => {
    try {
      // Only allow joining the room the token was issued for
      if (socket.data.docId !== docId) {
        return socket.emit("error", "Access denied");
      }

      let ydoc = activeDocuments.get(docId);

      if (!ydoc) {
        const Document = (await import("../models/documentModel.js")).default;
        const doc = await Document.findById(docId);
        if (!doc) return socket.emit("error", "Document not found");

        ydoc = new Y.Doc();
        if (doc.content?.length) {
          Y.applyUpdate(ydoc, new Uint8Array(doc.content));
        }
        activeDocuments.set(docId, ydoc);
      }

      socket.join(docId);

      // Send current document state to the newly joined client
      socket.emit("docSync", Y.encodeStateAsUpdate(ydoc));
    } catch (error) {
      console.error("Error joining document:", error);
    }
  });

  socket.on("docUpdate", (data) => {
    // Use server-verified docId and accessLevel — never trust client payload
    const { docId, accessLevel } = socket.data;
    if (!docId || accessLevel === "read") return;

    const ydoc = activeDocuments.get(docId);
    if (!ydoc) return;

    Y.applyUpdate(ydoc, new Uint8Array(data));
    socket.to(docId).emit("docUpdate", data);
  });

  socket.on("disconnect", () => {
    const { docId } = socket.data;
    if (!docId) return;

    // Clean up Y.Doc from memory when the last user leaves
    const room = io.sockets.adapter.rooms.get(docId);
    if (!room || room.size === 0) {
      activeDocuments.delete(docId);
      console.log(`Cleaned up Y.Doc for room ${docId}`);
    }
  });
});