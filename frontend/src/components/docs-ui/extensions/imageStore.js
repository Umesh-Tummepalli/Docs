/**
 * imageStore.js
 *
 * Singleton Maps for tracking image URLs across the editor.
 *
 * localImageMap    — uploadId → ObjectURL (blob:)   — pending uploads only
 * persistedImageMap — assetId  → real URL             — successfully uploaded images
 *
 * IMPORTANT: Always write to the map BEFORE calling the Tiptap command that
 * triggers a NodeView re-render, so the URL is available synchronously.
 */

/** @type {Map<string, string>} uploadId → blob ObjectURL */
export const localImageMap = new Map();

/** @type {Map<string, string>} assetId → persisted/CDN URL */
export const persistedImageMap = new Map();

/**
 * Register a local file as a pending upload.
 * Creates an ObjectURL from the File and stores it under uploadId.
 *
 * @param {string} uploadId - Temporary UUID for this upload
 * @param {File} file - The image File object
 * @returns {string} The created ObjectURL
 */
export function addLocal(uploadId, file) {
  const objectUrl = URL.createObjectURL(file);
  localImageMap.set(uploadId, objectUrl);
  return objectUrl;
}

/**
 * Remove a pending upload from the local map and revoke its ObjectURL.
 * Call this after a successful upload (swap to persisted) or on failure.
 *
 * @param {string} uploadId
 */
export function removeLocal(uploadId) {
  const url = localImageMap.get(uploadId);
  if (url) {
    URL.revokeObjectURL(url);
  }
  localImageMap.delete(uploadId);
}

/**
 * Register a successfully uploaded image in the persisted map.
 * Call this BEFORE calling replaceUploadWithAsset so the NodeView
 * can resolve the URL as soon as it re-renders with the new assetId.
 *
 * @param {string} assetId - The permanent asset ID from the server
 * @param {string} url - The real image URL (CDN / signed URL / etc.)
 */
export function addPersisted(assetId, url) {
  persistedImageMap.set(assetId, url);
}

/**
 * Resolve the display URL for a given set of image node attrs.
 * Priority: src (direct) → persistedImageMap[assetId] → localImageMap[uploadId] → null
 *
 * @param {{ assetId?: string|null, uploadId?: string|null, src?: string|null }} attrs
 * @returns {string|null}
 */
export function resolveImageUrl({ assetId, uploadId, src }) {
  if (src) return src;
  if (assetId && persistedImageMap.has(assetId)) return persistedImageMap.get(assetId);
  if (uploadId && localImageMap.has(uploadId)) return localImageMap.get(uploadId);
  return null;
}
