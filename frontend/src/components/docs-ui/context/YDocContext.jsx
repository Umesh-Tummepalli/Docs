import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { io } from "socket.io-client";
import api from "@/lib/api";

const YDocContext = createContext(null);

export const YDocProvider = ({ docId, children }) => {
  const [yDoc] = useState(() => new Y.Doc());
  const metadata = yDoc.getMap('metadata');
  const socketRef = useRef(null);
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    if (!docId) return;

    let socket;

    async function connect() {
      try {
        const res = await api.get(`/documents/${docId}/collab-token`);
        const { token } = res.data;

        socket = io(import.meta.env.VITE_BACKEND_URL || "http://localhost:8000", {
          auth: { token },
          transports: ["websocket"],
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          console.log("Socket connected:", socket.id);
          socket.emit("joinDocRoom", docId);
        });

        // Server sends full Y.Doc state on join — this is our hydration signal
        socket.on("docSync", (update) => {
          Y.applyUpdate(yDoc, new Uint8Array(update));
          setSynced(true);
        });

        // Incoming updates from other collaborators
        socket.on("docUpdate", (update) => {
          Y.applyUpdate(yDoc, new Uint8Array(update), socket);
        });

        socket.on("error", (msg) => {
          console.error("Collaboration error:", msg);
        });

        socket.on("connect_error", (err) => {
          console.error("Socket connection error:", err.message);
        });

        // Forward local Y.Doc changes to the server
        yDoc.on("update", (update, origin) => {
          // Don't echo back updates that arrived from the socket
          if (origin === socket) return;
          socket.emit("docUpdate", Array.from(update));
        });
      } catch (err) {
        console.error("Failed to connect to collaboration server:", err);
      }
    }

    connect();

    return () => {
      if (socket) {
        socket.disconnect();
        socketRef.current = null;
      }
      setSynced(false);
    };
  }, [docId, yDoc]);

  return (
    <YDocContext.Provider value={{ yDoc, metadata, socketRef, synced }}>
      {children}
    </YDocContext.Provider>
  );
};

const useYDoc = () => {
  const context = useContext(YDocContext);
  if (!context) {
    throw new Error("useYDoc must be used within a YDocProvider");
  }
  return context;
};

export default useYDoc;