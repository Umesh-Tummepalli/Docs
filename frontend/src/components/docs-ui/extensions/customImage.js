import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import CustomImageNodeView from "./CustomImageNodeView";

/**
 * CustomImage Tiptap Extension
 *
 * A single unified image node that supports three rendering paths:
 *
 *   assetId  → look up in persistedImageMap → show uploaded image
 *   uploadId → look up in localImageMap     → show local blob preview
 *   src      → use directly                 → show URL-inserted image
 *
 * Node attrs intentionally do NOT store a raw URL as the primary source
 * of truth (except for `src` on URL-inserted images). The NodeView
 * resolves URLs at render time from the image store.
 *
 * Parsing: compatible with existing <img> tags (reads src, data-asset-id,
 * data-upload-id attributes) so old content degrades gracefully.
 *
 * Commands available on the editor:
 *   editor.commands.insertPendingImage(uploadId, extraAttrs?)
 *   editor.commands.insertImageFromUrl(src, extraAttrs?)
 */
export const CustomImage = Node.create({
  name: "image",

  inline: false,
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      // Permanent ID assigned by the server after a successful upload.
      // Null while upload is in progress.
      assetId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-asset-id") || null,
        renderHTML: (attrs) =>
          attrs.assetId ? { "data-asset-id": attrs.assetId } : {},
      },

      // Temporary client-side ID assigned before the upload starts.
      // Null after the upload completes (replaced by assetId).
      uploadId: {
        default: null,
        parseHTML: (el) => el.getAttribute("data-upload-id") || null,
        renderHTML: (attrs) =>
          attrs.uploadId ? { "data-upload-id": attrs.uploadId } : {},
      },

      // Direct URL for images inserted via URL (not uploaded).
      // Also used as a fallback when parsing legacy <img src="..."> content.
      src: {
        default: null,
        parseHTML: (el) => {
          // Only use src if there's no assetId — avoids overwriting assetId
          // images with a stale src from old HTML content.
          const hasAssetId = el.getAttribute("data-asset-id");
          return hasAssetId ? null : el.getAttribute("src") || null;
        },
        renderHTML: (attrs) => (attrs.src ? { src: attrs.src } : {}),
      },

      width: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute("width")
            ? parseInt(el.getAttribute("width"), 10)
            : null,
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },

      height: {
        default: null,
        parseHTML: (el) =>
          el.getAttribute("height")
            ? parseInt(el.getAttribute("height"), 10)
            : null,
        renderHTML: (attrs) => (attrs.height ? { height: attrs.height } : {}),
      },

      alt: {
        default: "",
        parseHTML: (el) => el.getAttribute("alt") || "",
        renderHTML: (attrs) => ({ alt: attrs.alt || "" }),
      },

      title: {
        default: null,
        parseHTML: (el) => el.getAttribute("title") || null,
        renderHTML: (attrs) => (attrs.title ? { title: attrs.title } : {}),
      },

      // Controls horizontal alignment of the image block (left / center / right).
      // Stored as a data attribute so it round-trips through HTML without
      // conflicting with inline styles used by other extensions.
      alignment: {
        default: "center",
        parseHTML: (el) => el.getAttribute("data-alignment") || "center",
        renderHTML: (attrs) =>
          attrs.alignment && attrs.alignment !== "center"
            ? { "data-alignment": attrs.alignment }
            : {},
      },
    };
  },

  parseHTML() {
    return [
      // Wrapped format: <div class="image-wrapper"><img data-asset-id="..."></div>
      { tag: "div.image-wrapper img[data-asset-id]" },
      { tag: "div.image-wrapper img[data-upload-id]" },
      { tag: "div.image-wrapper img[src]" },
      // Legacy unwrapped format (backward compatibility)
      { tag: "img[data-asset-id]" },
      { tag: "img[data-upload-id]" },
      { tag: "img[src]" },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    // HTMLAttributes is already the merged result of each attr's renderHTML().
    // The alignment attr renders as "data-alignment" (or nothing for center),
    // so we read the original value from node.attrs and remove the rendered
    // key from imgAttrs so it doesn't land on the <img> tag.
    const alignment = node.attrs.alignment || "center";
    const { "data-alignment": _removed, ...imgAttrs } = HTMLAttributes;

    const alignStyle =
      alignment === "right"
        ? "text-align: right;"
        : alignment === "left"
        ? "text-align: left;"
        : "text-align: center;";

    return [
      "div",
      { style: alignStyle, class: "image-wrapper" },
      ["img", mergeAttributes(imgAttrs)],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CustomImageNodeView);
  },

  addCommands() {
    return {
      /**
       * Insert a pending image node (upload in progress).
       * Call addLocal(uploadId, file) in imageStore BEFORE this command.
       *
       * @param {string} uploadId  — Temporary upload ID (e.g. crypto.randomUUID())
       * @param {object} extraAttrs — Optional: width, height, alt, title
       */
      insertPendingImage:
        (uploadId, extraAttrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "image",
            attrs: {
              uploadId,
              assetId: null,
              src: null,
              ...extraAttrs,
            },
          });
        },

      /**
       * Insert an image from a direct URL (no upload).
       * The `src` attr is used directly by the NodeView.
       *
       * @param {string} src       — The image URL
       * @param {object} extraAttrs — Optional: width, height, alt, title
       */
      insertImageFromUrl:
        (src, extraAttrs = {}) =>
        ({ commands }) => {
          return commands.insertContent({
            type: "image",
            attrs: {
              src,
              assetId: null,
              uploadId: null,
              ...extraAttrs,
            },
          });
        },
    };
  },
});
