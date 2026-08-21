/**
 * imageUtils.js
 *
 * Utility functions for interacting with image nodes in the Tiptap editor.
 * These operate directly on the editor instance (not as Tiptap commands)
 * so they can be called from anywhere — ImageButton, upload handlers, etc.
 */

import { addPersisted, removeLocal } from "./imageStore";

/**
 * Find an image node by uploadId and replace it with the permanent assetId.
 * Call addPersisted() BEFORE this function so the NodeView can resolve the
 * URL as soon as ProseMirror re-renders it with the new attrs.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @param {string} uploadId - The temporary ID used while uploading
 * @param {string} assetId  - The permanent asset ID from the server
 */
export function replaceUploadWithAsset(editor, uploadId, assetId) {
  const { state } = editor;

  let position = null;
  let node = null;

  state.doc.descendants((currentNode, pos) => {
    if (
      currentNode.type.name === "image" &&
      currentNode.attrs.uploadId === uploadId
    ) {
      position = pos;
      node = currentNode;
      return false; // stop traversal
    }
    return true;
  });

  if (position === null) return;

  editor
    .chain()
    .command(({ tr }) => {
      tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        assetId,
        uploadId: null,
      });
      return true;
    })
    .run();
}

/**
 * Find and delete an image node by its uploadId.
 * Use this when an upload fails — cleans up the pending placeholder.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @param {string} uploadId
 */
export function deleteImageByUploadId(editor, uploadId) {
  const { state } = editor;

  let position = null;
  let nodeSize = null;

  state.doc.descendants((currentNode, pos) => {
    if (
      currentNode.type.name === "image" &&
      currentNode.attrs.uploadId === uploadId
    ) {
      position = pos;
      nodeSize = currentNode.nodeSize;
      return false;
    }
    return true;
  });

  if (position === null) return;

  editor
    .chain()
    .command(({ tr }) => {
      tr.delete(position, position + nodeSize);
      return true;
    })
    .run();
}

/**
 * Full success handler — call this when your upload API returns successfully.
 * Handles map updates and node replacement in one call.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @param {string} uploadId   - Temporary ID used during upload
 * @param {string} assetId    - Permanent asset ID from server
 * @param {string} url        - Resolved URL for the uploaded image
 */
export function onUploadSuccess(editor, uploadId, assetId, url) {
  // Cache the just-issued signed URL before swapping attrs. This keeps the
  // local preview visible rather than flashing a blank placeholder.
  if (url) addPersisted(assetId, url);

  // 1. Swap the node attrs — NodeView re-renders with assetId set.
  replaceUploadWithAsset(editor, uploadId, assetId);
  // 2. Clean up the local blob URL
  removeLocal(uploadId);
}

/**
 * Full failure handler — call this when your upload API fails.
 * Removes the placeholder node and revokes the local blob URL.
 *
 * @param {import('@tiptap/react').Editor} editor
 * @param {string} uploadId
 */
export function onUploadFailure(editor, uploadId) {
  removeLocal(uploadId);
  deleteImageByUploadId(editor, uploadId);
}
