import { useState } from "react";
import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  MessageSquarePlus,
  Printer,
  Redo2,
  RemoveFormattingIcon,
  SpellCheck,
  Underline,
  Undo2,
} from "lucide-react";

import { Separator } from "../ui/separator";
import { useEditorContext } from "./context/EditorContext";
import FontFamilyButton from "./toolbar/FontFamilyButton";
import FontSizeButton from "./toolbar/FontSizeButton";
import HeadingButton from "./toolbar/HeadingButton";
import HighlightButton from "./toolbar/HighlightButton";
import TextColorButton from "./toolbar/TextColorButton";
import ToolbarButton from "./toolbar/ToolbarButton";
import LinkButton from "./toolbar/LinkButton";
import ImageButton from "./toolbar/ImageButton";
import AlignButton from "./toolbar/AlignButton";
import ListButton from "./toolbar/ListButton";
import LineHeightButton from "./toolbar/LineHeightButton";
import api from "@/lib/api";
import { toast } from "react-toastify";
import { persistedImageMap } from "./extensions/imageStore";

// ─── Print helpers ────────────────────────────────────────────────────────────

/** Read the current margin values that the Ruler has set on :root. */
function getCurrentMargins() {
  const style = getComputedStyle(document.documentElement);
  const left = style.getPropertyValue("--page-margin-left").trim() || "48px";
  const right = style.getPropertyValue("--page-margin-right").trim() || "48px";
  return { left, right };
}

/**
 * Build a self-contained <style> block that replicates the .tiptap layout
 * including the live margin values, headings, lists, images, and tables.
 */
function buildPrintStyles(marginLeft, marginRight) {
  return `
    *, *::before, *::after { box-sizing: border-box; }
    body {
      font-family: Arial, sans-serif;
      background: white;
      margin: 0;
      padding: 0;
    }
    .tiptap-print {
      width: 794px;
      min-height: 1123px;
      padding: 96px ${marginRight} 96px ${marginLeft};
      margin: 0 auto;
      background: white;
    }
    /* Images — alignment is carried by the .image-wrapper div */
    .image-wrapper {
      display: block;
      width: 100%;
      margin: 1.5rem 0;
    }
    .image-wrapper img {
      display: inline-block;
      max-width: 100%;
      height: auto;
      border-radius: 1rem;
    }
    /* Headings */
    h1, h2, h3, h4, h5, h6 { line-height: 1.1; text-wrap: pretty; }
    h1 { font-size: 32px; margin-top: 3.5rem; margin-bottom: 1.5rem; }
    h2 { font-size: 24px; margin-top: 3.5rem; margin-bottom: 1.5rem; }
    h3 { font-size: 20px; margin-top: 2.5rem; margin-bottom: 1rem; }
    h4 { font-size: 16px; margin-top: 2.5rem; margin-bottom: 1rem; }
    h5, h6 { font-size: 14px; margin-top: 2.5rem; margin-bottom: 1rem; }
    /* Lists */
    ul:not([data-type='taskList']) {
      list-style-type: disc;
      padding-left: 1.5rem;
      margin: 1.25rem 1rem 1.25rem 0.4rem;
    }
    ol {
      list-style-type: decimal;
      padding-left: 1.5rem;
      margin: 1.25rem 1rem 1.25rem 0.4rem;
    }
    ul[data-list-style='circle'] > li { list-style-type: circle; }
    ul[data-list-style='square'] > li { list-style-type: square; }
    ol[data-list-style='lower-alpha'] > li { list-style-type: lower-alpha; }
    ol[data-list-style='upper-alpha'] > li { list-style-type: upper-alpha; }
    ol[data-list-style='lower-roman'] > li { list-style-type: lower-roman; }
    ol[data-list-style='upper-roman'] > li { list-style-type: upper-roman; }
    /* Links */
    a { color: #2e6ad2; }
    /* Tables */
    table { border-collapse: collapse; width: 100%; table-layout: fixed; margin: 1.5rem 0; }
    td, th { border: 1px solid black; padding: 6px 8px; vertical-align: top; }
    th { background-color: #c7c7c7; font-weight: bold; text-align: left; }
    /* Highlights / marks */
    mark { border-radius: 0.4rem; padding: 0.1rem 0.3rem; }
    @media print {
      @page { size: portrait; margin: 0; }
      body { padding: 0; }
    }
  `;
}

/** Walk the editor JSON and collect every unique assetId from image nodes. */
function collectAssetIds(editorJson) {
  const ids = new Set();
  function walk(node) {
    if (node.type === "image" && node.attrs?.assetId) ids.add(node.attrs.assetId);
    if (node.content) node.content.forEach(walk);
  }
  if (editorJson?.content) editorJson.content.forEach(walk);
  return ids;
}

/**
 * Replace every <img data-asset-id="X"> in the HTML string with
 * <img src="URL"> so isolated windows/Puppeteer can load the images.
 */
function injectImageSrcs(html, assetUrlMap) {
  return html.replace(
    /<img([^>]*?)data-asset-id="([^"]+)"([^>]*?)>/g,
    (match, before, assetId, after) => {
      const url = assetUrlMap.get(assetId);
      if (!url) return match;
      return `<img${before}src="${url}"${after}>`;
    }
  );
}

/** Fetch signed URLs for all assetIds, using the in-memory cache where possible. */
async function resolveAssetUrls(assetIds, docId) {
  const assetUrlMap = new Map();
  await Promise.all(
    Array.from(assetIds).map(async (assetId) => {
      const cached = persistedImageMap.get(assetId);
      if (cached) { assetUrlMap.set(assetId, cached); return; }
      try {
        const response = await api.get(`/documents/${docId}/asseturl/${assetId}`);
        assetUrlMap.set(assetId, response.data.url);
      } catch { /* skip — image will be absent but won't crash */ }
    })
  );
  return assetUrlMap;
}

// ─────────────────────────────────────────────────────────────────────────────

const ToolBar = ({ docId }) => {
  const editor = useEditorContext();
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);

  const toggleSpellcheck = () => {
    if (!editor) return;
    const nextSpellcheck = !spellcheckEnabled;
    const editorDom = document
      .getElementById("document")
      ?.querySelector("[contenteditable='true']");
    editorDom?.setAttribute("spellcheck", String(nextSpellcheck));
    editorDom?.setAttribute("autocorrect", nextSpellcheck ? "on" : "off");
    editorDom?.setAttribute("lang", editorDom.getAttribute("lang") || "en-US");
    setSpellcheckEnabled(nextSpellcheck);
    editor.commands.focus();
  };

  const handlePrint = async () => {
    if (!editor) return;

    const assetIds = collectAssetIds(editor.getJSON());
    const assetUrlMap = await resolveAssetUrls(assetIds, docId);
    const html = injectImageSrcs(editor.getHTML(), assetUrlMap);
    const { left, right } = getCurrentMargins();

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Print popup was blocked. Please allow popups for this site.");
      return;
    }

    printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Document</title>
    <style>${buildPrintStyles(left, right)}</style>
  </head>
  <body>
    <div class="tiptap-print">${html}</div>
  </body>
</html>`);

    printWindow.document.close();

    // Wait for all images to finish loading before triggering print.
    const images = Array.from(printWindow.document.images);
    await Promise.all(
      images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      })
    );

    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // ── PDF export — disabled for now (Puppeteer image loading issue) ──────────
  // const handleExportPdf = async () => { ... };

  const { canUndo, canRedo, isBoldActive, isItalicActive, isUnderlineActive } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
      isBoldActive: currentEditor?.isActive("bold") ?? false,
      isItalicActive: currentEditor?.isActive("italic") ?? false,
      isUnderlineActive: currentEditor?.isActive("underline") ?? false,
    }),
  });

  const sections = [
    [
      {
        label: "undo",
        Icon: Undo2,
        disabled: !canUndo,
        onClick: () => { editor?.chain().focus().undo().run(); },
      },
      {
        label: "redo",
        Icon: Redo2,
        disabled: !canRedo,
        onClick: () => { editor?.chain().focus().redo().run(); },
      },
      {
        label: "print",
        Icon: Printer,
        onClick: handlePrint,
      },
      {
        label: "spell-check",
        Icon: SpellCheck,
        isActive: spellcheckEnabled,
        onClick: toggleSpellcheck,
      },
    ],
    [
      {
        label: "bold",
        Icon: Bold,
        isActive: isBoldActive,
        onClick: () => { editor?.chain().focus().toggleBold().run(); },
      },
      {
        label: "italic",
        Icon: Italic,
        isActive: isItalicActive,
        onClick: () => { editor?.chain().focus().toggleItalic().run(); },
      },
      {
        label: "underline",
        Icon: Underline,
        isActive: isUnderlineActive,
        onClick: () => { editor?.chain().focus().toggleUnderline().run(); },
      },
    ],
    [
      {
        label: "comment",
        Icon: MessageSquarePlus,
        onClick: () => { console.log("comment"); },
      },
      {
        label: "remove-formatting",
        Icon: RemoveFormattingIcon,
        onClick: () => { editor?.chain().focus().unsetAllMarks().clearNodes().run(); },
      },
    ],
  ];

  return (
    <div className="relative z-10 pb-2">
      <div className="mx-auto flex w-full max-w-[95vw] flex-wrap items-center justify-center gap-x-1 gap-y-1 rounded-lg bg-[#f9fbfd] p-2 shadow-sm ring-1 ring-slate-200">
        {/* Section 1: Undo/Redo/Print/Spellcheck */}
        {sections[0]?.map((item) => (
          <ToolbarButton key={item.label} {...item} />
        ))}
        <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300 hidden sm:block" />

        {/* Section 2: Bold/Italic/Underline */}
        {sections[1]?.map((item) => (
          <ToolbarButton key={item.label} {...item} />
        ))}
        <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300 hidden sm:block" />

        {/* Layout & Typography controls */}
        <AlignButton />
        <ListButton />
        <LineHeightButton />
        <FontFamilyButton />
        <FontSizeButton />
        <HeadingButton />
        <HighlightButton />
        <TextColorButton />
        <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300 hidden sm:block" />
        
        {/* Insert controls */}
        <LinkButton />
        <ImageButton />
        <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300 hidden sm:block" />

        {/* Section 3: Comment/Remove formatting */}
        {sections[2]?.map((item) => (
          <ToolbarButton key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
};

export default ToolBar;
