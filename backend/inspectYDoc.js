/**
 * inspectYDoc.js
 *
 * Usage:
 *   node inspectYDoc.js [docId]
 *
 * If no docId is given it will use the most recently created document.
 *
 * What it does:
 *   1. Connects to Mongo, loads the raw Y.js binary from the document.
 *   2. Deserialises it into a Y.Doc.
 *   3. Walks the entire XML tree rooted at "prosemirror" and serialises
 *      it to a real XML string — no TipTap, no ProseMirror schema needed.
 *   4. Writes the XML to  ydoc_inspect.xml  for manual inspection.
 *   5. Prints every node whose nodeName contains "image" (case-insensitive)
 *      along with all its attributes, so you can see exactly how image
 *      metadata is stored.
 */

import "dotenv/config";
import mongoose from "mongoose";
import * as Y from "yjs";
import fs from "fs";
import Document from "./models/documentModel.js";

// ── helpers ──────────────────────────────────────────────────────────────────

/**
 * Recursively serialise a Y.XmlFragment / Y.XmlElement / Y.XmlText to an
 * XML string WITHOUT any external dependencies.
 */
function yjsNodeToXml(node, indent = 0) {
  const pad = "  ".repeat(indent);

  // ── Y.XmlText ──────────────────────────────────────────────────────────
  // It has no nodeName property and holds a plain string.
  if (node instanceof Y.XmlText) {
    const raw = node.toString();
    // Also dump the delta so we can see embedded objects (e.g. inline images
    // stored as Y.XmlText inserts with object payloads).
    const delta = node.toDelta();
    const hasDeltaObjects = delta.some(
      (op) => op.insert && typeof op.insert === "object"
    );
    if (hasDeltaObjects) {
      // Pretty-print delta objects as XML-ish comments so they're visible.
      const parts = delta.map((op) => {
        if (op.insert && typeof op.insert === "object") {
          const attrs = Object.entries(op.insert)
            .map(([k, v]) => `${k}="${escapeXml(String(v))}"`)
            .join(" ");
          return `${pad}  <delta:object ${attrs} />`;
        }
        return `${pad}  <delta:text>${escapeXml(String(op.insert))}</delta:text>`;
      });
      return parts.join("\n");
    }
    return `${pad}${escapeXml(raw)}`;
  }

  // ── Y.XmlElement / Y.XmlFragment ──────────────────────────────────────
  const tag = node.nodeName ?? "fragment";

  // Build attribute string (only XmlElement has getAttributes)
  let attrStr = "";
  if (typeof node.getAttributes === "function") {
    const attrs = node.getAttributes();
    attrStr = Object.entries(attrs)
      .map(([k, v]) => ` ${k}="${escapeXml(String(v))}"`)
      .join("");
  }

  const children = node.toArray ? node.toArray() : [];

  if (children.length === 0) {
    return `${pad}<${tag}${attrStr} />`;
  }

  const childXml = children
    .map((c) => yjsNodeToXml(c, indent + 1))
    .join("\n");

  return `${pad}<${tag}${attrStr}>\n${childXml}\n${pad}</${tag}>`;
}

function escapeXml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Walk every node in the Y.js XML tree and collect nodes whose nodeName
 * matches a predicate.
 */
function collectNodes(node, predicate, results = []) {
  if (node.nodeName && predicate(node.nodeName)) {
    results.push(node);
  }
  const children = node.toArray ? node.toArray() : [];
  for (const child of children) {
    collectNodes(child, predicate, results);
  }
  return results;
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("MongoDB connected");

  const docId = process.argv[2];
  let doc;

  if (docId) {
    doc = await Document.findById(docId);
    if (!doc) {
      console.error(`Document not found: ${docId}`);
      process.exit(1);
    }
  } else {
    doc = await Document.findOne().sort({ createdAt: -1 });
    if (!doc) {
      console.error("No documents in the database.");
      process.exit(1);
    }
  }

  console.log(`\nInspecting document: ${doc._id}  ("${doc.title}")`);
  console.log(`Content length: ${doc.content?.length ?? 0} bytes\n`);

  // ── Deserialise ──────────────────────────────────────────────────────────
  const ydoc = new Y.Doc();
  if (doc.content?.length) {
    Y.applyUpdate(ydoc, new Uint8Array(doc.content));
  } else {
    console.warn("Document has no content — Y.Doc will be empty.");
  }

  // ── Serialise XML tree ───────────────────────────────────────────────────
  const fragment = ydoc.get("prosemirror", Y.XmlFragment);

  // List all top-level shared types so we know what keys the doc uses
  console.log("=== Shared type keys in this Y.Doc ===");
  // Y.Doc exposes share (a Map) internally — iterate it safely
  for (const [key] of ydoc.share) {
    console.log("  key:", key);
  }
  console.log("");

  const xmlString = yjsNodeToXml(fragment);
  const outputPath = "ydoc_inspect.xml";

  fs.writeFileSync(outputPath, xmlString, "utf8");
  console.log(`XML written to: ${outputPath}\n`);

  // ── Find image nodes ─────────────────────────────────────────────────────
  const imageNodes = collectNodes(
    fragment,
    (name) => name.toLowerCase().includes("image")
  );

  console.log(`=== Image nodes found: ${imageNodes.length} ===`);
  if (imageNodes.length === 0) {
    console.log(
      "No nodes with 'image' in their nodeName found.\n" +
        "Check ydoc_inspect.xml to see the actual node names used."
    );
  } else {
    for (const node of imageNodes) {
      console.log(`\nnodeName: ${node.nodeName}`);
      console.log("attributes:", node.getAttributes());
    }
  }

  // Also dump ALL unique nodeName values found in the tree so you can see
  // exactly what the frontend is calling its nodes.
  const allNodeNames = new Set();
  function collectNames(n) {
    if (n.nodeName) allNodeNames.add(n.nodeName);
    const ch = n.toArray ? n.toArray() : [];
    for (const c of ch) collectNames(c);
  }
  collectNames(fragment);

  console.log("\n=== All node names in the document ===");
  for (const name of allNodeNames) {
    console.log(" ", name);
  }

  await mongoose.disconnect();
  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
