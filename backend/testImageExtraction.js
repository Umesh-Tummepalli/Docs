/**
 * testImageExtraction.js
 *
 * Fetches all documents from Mongo, runs extractImagesFromYDoc on each,
 * and prints a clear pass/fail report. Also dumps the XML for any doc
 * that has images so you can visually verify the node structure.
 *
 * Usage:  node testImageExtraction.js
 */

import "dotenv/config";
import mongoose from "mongoose";
import * as Y from "yjs";
import fs from "fs";
import Document from "./models/documentModel.js";
import { extractImagesFromYDoc } from "./utils/yDocUtils.js";

await mongoose.connect(process.env.MONGODB_URI);
console.log("MongoDB connected\n");

const docs = await Document.find({});
console.log(`Found ${docs.length} document(s)\n`);
console.log("─".repeat(60));

let totalImages = 0;

for (const doc of docs) {
  const ydoc = new Y.Doc();

  if (doc.content?.length) {
    Y.applyUpdate(ydoc, new Uint8Array(doc.content));
  }

  // ── shared type keys ────────────────────────────────────────────────────
  const keys = Array.from(ydoc.share.keys());

  // ── run the extractor ───────────────────────────────────────────────────
  let images;
  let error = null;
  try {
    images = extractImagesFromYDoc(ydoc);
  } catch (err) {
    images = [];
    error = err;
  }

  const status = error ? "ERROR" : "OK";
  console.log(`\n[${status}] ${doc._id}  "${doc.title}"`);
  console.log(`       content: ${doc.content?.length ?? 0} bytes`);
  console.log(`       shared keys: [${keys.join(", ")}]`);

  if (error) {
    console.error("       ERROR:", error.message);
    continue;
  }

  console.log(`       images found: ${images.length}`);

  if (images.length > 0) {
    totalImages += images.length;
    images.forEach((img, i) => {
      console.log(`         [${i + 1}] assetId=${img.assetId}  alt="${img.alt ?? ""}"`);
    });

    // Dump XML for visual inspection
    const xmlFile = `ydoc_${doc._id}.xml`;
    const fragment = ydoc.get("prosemirror", Y.XmlFragment);
    fs.writeFileSync(xmlFile, serializeToXml(fragment), "utf8");
    console.log(`       XML dumped → ${xmlFile}`);
  }
}

console.log("\n" + "─".repeat(60));
console.log(`Total images across all documents: ${totalImages}`);

if (totalImages === 0) {
  console.log(
    "\nNOTE: No documents currently have images. To fully test,\n" +
    "open a doc in the editor, insert an image, then re-run this script."
  );
}

await mongoose.disconnect();
console.log("Done.");

// ── XML serialiser (no deps) ─────────────────────────────────────────────────

function serializeToXml(node, indent = 0) {
  const pad = "  ".repeat(indent);

  if (node instanceof Y.XmlText) {
    return `${pad}${escXml(node.toString())}`;
  }

  const tag = node.nodeName ?? "fragment";
  let attrStr = "";
  if (typeof node.getAttributes === "function") {
    attrStr = Object.entries(node.getAttributes())
      .map(([k, v]) => ` ${k}="${escXml(String(v))}"`)
      .join("");
  }

  const children = node.toArray ? node.toArray() : [];
  if (children.length === 0) return `${pad}<${tag}${attrStr} />`;

  const inner = children.map((c) => serializeToXml(c, indent + 1)).join("\n");
  return `${pad}<${tag}${attrStr}>\n${inner}\n${pad}</${tag}>`;
}

function escXml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
