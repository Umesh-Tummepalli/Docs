import * as Y from "yjs";
import {
  Awareness,
  applyAwarenessUpdate,
  encodeAwarenessUpdate,
} from "y-protocols/awareness";
import { io } from "socket.io-client";

export class SocketIOYProvider {
  constructor({
    docId,
    token,
    serverUrl,
    ydoc,
  }) {
    this.docId = docId;
    this.token = token;
    this.ydoc = ydoc;

    this.socket = null;
    this.synced = false;

    // Awareness is completely separate from the Y.Doc.
    this.awareness = new Awareness(this.ydoc);

    this.serverUrl =
      serverUrl || "http://localhost:8000";

    this._handleYDocUpdate =
      this._handleYDocUpdate.bind(this);

    this._handleAwarenessUpdate =
      this._handleAwarenessUpdate.bind(this);

    this._handleDocSync =
      this._handleDocSync.bind(this);

    this._handleDocUpdate =
      this._handleDocUpdate.bind(this);

    this._handleAwarenessUpdateFromServer =
      this._handleAwarenessUpdateFromServer.bind(this);
  }

  connect() {
    if (this.socket) return;

    this.socket = io(this.serverUrl, {
      auth: {
        token: this.token,
      },
      transports: ["websocket"],
    });

    // -------------------------
    // SOCKET CONNECTION
    // -------------------------

    this.socket.on("connect", () => {
      console.log(
        "Socket connected:",
        this.socket.id
      );

      this.socket.emit(
        "joinDocRoom",
        this.docId
      );
    });

    // -------------------------
    // INITIAL Y.DOC SYNC
    // -------------------------

    this.socket.on(
      "docSync",
      this._handleDocSync
    );

    // -------------------------
    // REMOTE Y.DOC UPDATE
    // -------------------------

    this.socket.on(
      "docUpdate",
      this._handleDocUpdate
    );

    // -------------------------
    // REMOTE AWARENESS UPDATE
    // -------------------------

    this.socket.on(
      "awarenessUpdate",
      this._handleAwarenessUpdateFromServer
    );

    // -------------------------
    // LOCAL Y.DOC UPDATE
    // -------------------------

    this.ydoc.on(
      "update",
      this._handleYDocUpdate
    );

    // -------------------------
    // LOCAL AWARENESS UPDATE
    // -------------------------

    this.awareness.on(
      "update",
      this._handleAwarenessUpdate
    );

    // -------------------------
    // ERRORS
    // -------------------------

    this.socket.on("connect_error", (err) => {
      console.error(
        "Socket connection error:",
        err.message
      );
    });

    this.socket.on("error", (err) => {
      console.error(
        "Collaboration error:",
        err
      );
    });
  }

  // =====================================================
  // Y.DOC
  // =====================================================

  _handleYDocUpdate(update, origin) {
    if (!this.socket) return;

    // Ignore updates that originated from this provider.
    if (origin === this) return;

    // Emit raw bytes — server reads docId from socket.data (JWT).
    // Wrapping in an object would break Y.applyUpdate on the server.
    this.socket.emit("docUpdate", Array.from(update));
  }

  _handleDocSync(update) {
    Y.applyUpdate(
      this.ydoc,
      new Uint8Array(update),
      this
    );

    this.synced = true;

    if (this.onSynced) {
      this.onSynced();
    }
  }

  _handleDocUpdate(update) {
    Y.applyUpdate(
      this.ydoc,
      new Uint8Array(update),
      this
    );
  }

  // =====================================================
  // AWARENESS
  // =====================================================

  _handleAwarenessUpdate({ added, updated, removed }) {
    if (!this.socket) return;

    const changedClients = [...added, ...updated, ...removed];

    const update = encodeAwarenessUpdate(this.awareness, changedClients);

    // Emit raw bytes — server reads docId from socket.data (JWT).
    // Wrapping in an object would break applyAwarenessUpdate on the server.
    this.socket.emit("awarenessUpdate", Array.from(update));
  }

  _handleAwarenessUpdateFromServer(update) {
    applyAwarenessUpdate(
      this.awareness,
      new Uint8Array(update),
      this
    );
  }

  // =====================================================
  // USER INFORMATION
  // =====================================================

  setUser(user) {
    this.awareness.setLocalStateField(
      "user",
      user
    );
  }

  // =====================================================
  // CLEANUP
  // =====================================================

  destroy() {
    if (this.socket) {
      this.socket.off(
        "docSync",
        this._handleDocSync
      );

      this.socket.off(
        "docUpdate",
        this._handleDocUpdate
      );

      this.socket.off(
        "awarenessUpdate",
        this._handleAwarenessUpdateFromServer
      );

      this.socket.disconnect();

      this.socket = null;
    }

    this.ydoc.off(
      "update",
      this._handleYDocUpdate
    );

    this.awareness.off(
      "update",
      this._handleAwarenessUpdate
    );

    this.awareness.destroy();

    this.synced = false;
  }
}