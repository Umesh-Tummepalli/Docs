import { createContext, useContext, useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import api from "@/lib/api";
import { SocketIOYProvider } from "@/lib/SocketProvider";

const YDocContext = createContext(null);

// Deterministic colour from a string so the same user always gets the same colour.
function stringToColor(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}, 70%, 45%)`;
}



export const YDocProvider = ({ docId, children }) => {
  // The single Y.Doc for this document. Uses Yjs default (random) clientID.
  // Starts as null; the editor shows <Loading /> until it's set.
  const [yDoc, setYDoc] = useState(null);

  // The SocketIOYProvider instance — null until token is fetched.
  const [provider, setProvider] = useState(null);

  // Whether the initial docSync has been applied.
  const [synced, setSynced] = useState(false);

  // True when the backend returns 409 — document is already open in another tab.
  const [duplicateSession, setDuplicateSession] = useState(false);

  // Keep a stable ref so the cleanup closure always sees the latest provider.
  const providerRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    let cancelled = false;

    async function connect() {
      try {
        // 1. Fetch the current authenticated user to get display name/colour for Awareness.
        let userInfo = { name: "Anonymous", color: "#888888" };
        try {
          const meRes = await api.get("/auth/me");
          const { username, email } = meRes.data?.user ?? meRes.data ?? {};
          const name = username || email || "Anonymous";
          const color = stringToColor(name);
          userInfo = { name, color };
        } catch {
          // Auth failed — fall back to anonymous.
        }

        if (cancelled) return;

        // 2. Create the Y.Doc — let Yjs assign a random clientID (default behaviour).
        const doc = new Y.Doc();
        setYDoc(doc);

        // 3. Fetch a short-lived collab token for this document.
        let tokenRes;
        try {
          tokenRes = await api.get(`/documents/${docId}/collab-token`);
        } catch (err) {
          if (err.response?.status === 409) {
            if (!cancelled) setDuplicateSession(true);
            return;
          }
          throw err;
        }
        const { token } = tokenRes.data;

        if (cancelled) return;

        // 4. Create the provider and wire it to the Y.Doc.
        const prov = new SocketIOYProvider({
          docId,
          token,
          serverUrl: import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000",
          ydoc: doc,
        });

        // 5. Register the synced callback BEFORE connecting so we don't miss the event.
        prov.onSynced = () => {
          if (!cancelled) setSynced(true);
        };

        // 6. Connect (opens the socket, joins the room, wires all listeners).
        prov.connect();

        providerRef.current = prov;
        setProvider(prov);

        // 7. Publish the user into Awareness so the caret label renders correctly.
        prov.setUser({ name: userInfo.name, color: userInfo.color });
      } catch (err) {
        console.error("Failed to connect to collaboration server:", err);
      }
    }

    connect();

    return () => {
      cancelled = true;

      if (providerRef.current) {
        providerRef.current.destroy();
        providerRef.current = null;
      }

      setProvider(null);
      setSynced(false);
      setYDoc(null);
      setDuplicateSession(false);
    };
  }, [docId]);

  return (
    <YDocContext.Provider value={{ yDoc, provider, synced, duplicateSession }}>
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
