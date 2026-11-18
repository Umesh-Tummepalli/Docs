// In-memory access registry for active collaboration documents.
// MongoDB remains the source of truth; this registry provides fast checks for
// connected sockets and is synchronized whenever permissions change.
const activeDocumentAccess = new Map(); // docId -> Map(userId -> { accessLevel, sockets })

const key = (value) => String(value);

export const ensureDocumentAccessRegistry = (documentId) => {
  const id = key(documentId);
  if (!activeDocumentAccess.has(id)) activeDocumentAccess.set(id, new Map());
  return activeDocumentAccess.get(id);
};

export const registerDocumentUser = (documentId, userId, accessLevel, socket) => {
  const users = ensureDocumentAccessRegistry(documentId);
  const uid = key(userId);
  const current = users.get(uid) || { accessLevel, sockets: new Set() };
  current.accessLevel = accessLevel;
  if (socket) current.sockets.add(socket);
  users.set(uid, current);
  return current;
};

export const unregisterDocumentUser = (documentId, userId, socket) => {
  const users = activeDocumentAccess.get(key(documentId));
  if (!users) return;
  const entry = users.get(key(userId));
  if (!entry) return;
  if (socket) entry.sockets.delete(socket);
  if (!entry.sockets.size) users.delete(key(userId));
  if (!users.size) activeDocumentAccess.delete(key(documentId));
};

export const getRegisteredAccess = (documentId, userId) =>
  activeDocumentAccess.get(key(documentId))?.get(key(userId))?.accessLevel || null;

export const syncDocumentUserAccess = (documentId, userId, accessLevel) => {
  const users = activeDocumentAccess.get(key(documentId));
  if (!users) return;
  const entry = users.get(key(userId));
  if (!entry) return;
  entry.accessLevel = accessLevel;
  for (const socket of entry.sockets) {
    socket.data.accessLevel = accessLevel;
    if (!accessLevel) socket.emit('error', 'Access revoked');
  }
};

export const removeDocumentUserAccess = (documentId, userId) =>
  syncDocumentUserAccess(documentId, userId, null);

// Notify every currently connected owner for a document. Owners are discovered
// from the in-memory registry, while MongoDB remains the source of truth.
export const notifyDocumentOwners = (documentId, targetUserId, accessLevel, action = 'updated') => {
  const users = activeDocumentAccess.get(key(documentId));
  if (!users) return;
  const payload = { documentId: key(documentId), targetUserId: key(targetUserId), accessLevel, action };
  for (const [userId, entry] of users) {
    if (entry.accessLevel !== 'owner' || userId === key(targetUserId)) continue;
    for (const socket of entry.sockets) socket.emit('accessChanged', { ...payload, audience: 'owner' });
  }
};

export const notifyDocumentAccessChanged = (documentId, targetUserId, accessLevel, action = 'updated') => {
  const users = activeDocumentAccess.get(key(documentId));
  if (!users) return;
  const payload = { documentId: key(documentId), targetUserId: key(targetUserId), accessLevel, action };
  const target = users.get(key(targetUserId));
  for (const socket of target?.sockets || []) socket.emit('accessChanged', { ...payload, audience: 'target' });
  notifyDocumentOwners(documentId, targetUserId, accessLevel, action);
};

export const clearDocumentAccessRegistry = (documentId) => {
  activeDocumentAccess.delete(key(documentId));
};

export default activeDocumentAccess;
