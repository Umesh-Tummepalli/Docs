import * as Y from "yjs";
import DocumentAsset from "../models/documentAssetModel.js";
import { deleteObject } from "./s3.js";

/**
 * Walk the Y.js XML tree stored under the "prosemirror" key and return every
 * image node's attributes.
 *
 * Root cause of the original bug:
 *   ydoc.get("prosemirror")                  → returns AbstractType (no XML tree)
 *   ydoc.get("prosemirror", Y.XmlFragment)   → returns the real XmlFragment
 *
 * Image nodes look like:
 *   <image alt="" assetId="6a931cbb60ecfa6973a47ef3" />
 */
export function extractImagesFromYDoc(ydoc) {
  // MUST pass Y.XmlFragment as the second arg — without it Y.js returns a raw
  // AbstractType that has no toArray() / nodeName / getAttributes().
  const fragment = ydoc.get("prosemirror", Y.XmlFragment);

  const images = [];

  function traverse(node) {
    // Y.XmlText has no nodeName — skip it.
    if (node instanceof Y.XmlText) return;

    if (node.nodeName === "image") {
      const attrs = node.getAttributes(); // { alt, assetId, … }
      if (attrs.assetId) {
        images.push(attrs);
      }
    }

    // Recurse into children (works for both XmlFragment and XmlElement).
    const children = node.toArray ? node.toArray() : [];
    for (const child of children) {
      traverse(child);
    }
  }

  traverse(fragment);
  return images;
}

/**
 * After a collaborative session ends, compare the assets referenced in the
 * Y.Doc against every DocumentAsset record for this document.
 *
 * Any asset that is no longer referenced in the document is:
 *   1. Deleted from S3 (removeObject).
 *   2. Deleted from the DocumentAsset collection.
 *
 * @param {string}  docId  - MongoDB document ID
 * @param {Y.Doc}   ydoc   - The final in-memory Y.Doc for this session
 */
export async function cleanUnusedAssets(docId, ydoc) {
  // Collect assetIds that are still referenced in the document.
  try {
    
    const referencedImages = extractImagesFromYDoc(ydoc);
    const referencedAssetIds = new Set(referencedImages.map((img) => img.assetId));

    // Fetch every asset record stored for this document.
    const storedAssets = await DocumentAsset.find({ documentId: docId });

    // Identify the ones that are no longer in the document.
    const unusedAssets = storedAssets.filter(
      (asset) => !referencedAssetIds.has(asset._id.toString())
    );

    if (unusedAssets.length === 0) {
      console.log(`[cleanUnusedAssets] No unused assets for document ${docId}`);
      return;
    }

    console.log(
      `[cleanUnusedAssets] Removing ${unusedAssets.length} unused asset(s) for document ${docId}`
    );

    // Delete each unused asset from S3 then from the DB.
    // Use allSettled so one S3 failure doesn't block the rest.
    const results = await Promise.allSettled(
      unusedAssets.map(async (asset) => {
        await deleteObject(asset.key);
        await DocumentAsset.deleteOne({ _id: asset._id });
      })
    );

    // Log any individual failures without throwing — cleanup is best-effort.
    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[cleanUnusedAssets] Failed to delete an asset:", result.reason);
      }
    }
  }
  catch (err) {
    console.error(`cleanUnusedAssets failed for ${docId}:`, err);
  }
}
