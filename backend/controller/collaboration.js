import { io } from "../main.js";
import { Document } from "../models/document.js";
import * as Y from "yjs";

const activeDocuments = new Map();

io.on("connection", (socket) => {
  console.log("a user connected", socket.id);

  socket.on("joinDocRoom", async (docId) => {
    try {
      let ydoc = activeDocuments.get(docId);

      // Document isn't active yet
      if (!ydoc) {
        const doc = await Document.findById(docId);

        if (!doc) {
          return;
        }

        ydoc = new Y.Doc();

        Y.applyUpdate(
          ydoc,
          new Uint8Array(doc.content)
        );

        activeDocuments.set(docId, ydoc);
      }

      socket.join(docId);

      // Give the newly joined client the current state
      const state = Y.encodeStateAsUpdate(ydoc);

      socket.emit("docSync", state);

    } catch (error) {
      console.error("Error joining document:", error);
    }
  });

  socket.on("docUpdate", (data, room) => {
    const ydoc = activeDocuments.get(room);

    if (!ydoc) return;

    Y.applyUpdate(ydoc, new Uint8Array(data));

    socket.to(room).emit("docUpdate", data);
  });
});