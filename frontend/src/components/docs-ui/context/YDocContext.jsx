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
  // The single Y.Doc for this document — never recreated.
  const [yDoc] = useState(() => new Y.Doc());

  // The SocketIOYProvider instance — null until token is fetched.
  const [provider, setProvider] = useState(null);

  // Whether the initial docSync has been applied.
  const [synced, setSynced] = useState(false);

  // Keep a stable ref so the cleanup closure always sees the latest provider.
  const providerRef = useRef(null);

  useEffect(() => {
    if (!docId) return;

    let cancelled = false;

    async function connect() {
      try {
        // 1. Fetch a short-lived collab token for this document.
        const tokenRes = await api.get(`/documents/${docId}/collab-token`);
        const { token } = tokenRes.data;

        if (cancelled) return;

        // 2. Create the provider (uses the existing SocketIOYProvider class).
        //    It creates its own Awareness instance internally — we do NOT create one here.
        const prov = new SocketIOYProvider({
          docId,
          token,
          serverUrl: import.meta.env.VITE_BACKEND_URL || "http://localhost:8000",
          ydoc: yDoc,
        });

        // 3. Register the synced callback BEFORE connecting so we don't miss the event.
        prov.onSynced = () => {
          if (!cancelled) setSynced(true);
        };

        // 4. Connect (opens the socket, joins the room, wires all listeners).
        prov.connect();

        providerRef.current = prov;
        setProvider(prov);

        // 5. Fetch the current authenticated user and publish them into Awareness.
        //    This is the only place user info enters the awareness state.
        try {
          const meRes = await api.get("/auth/me");
          const { username, email } = meRes.data?.user ?? meRes.data ?? {};
          const name = username || email || "Anonymous";
          const color = stringToColor(name);

          // SocketIOYProvider.setUser() calls awareness.setLocalStateField("user", …)
          prov.setUser({ name, color });
        } catch {
          // Auth endpoint failed (e.g. session expired) — set a fallback so the
          // caret label still renders rather than crashing.
          prov.setUser({ name: "Anonymous", color: "#888888" });
        }
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
    };
  }, [docId, yDoc]);

  return (
    <YDocContext.Provider value={{ yDoc, provider, synced }}>
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
