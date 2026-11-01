import { load } from "cheerio";
import juice from "juice";
import sanitizeHtml from "sanitize-html";
import { imageSize } from "image-size";
import puppeteer from "puppeteer";
import {
  AlignmentType,
  BorderStyle,
  Document,
  ExternalHyperlink,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const A4_WIDTH_TWIPS = 11906;
const A4_HEIGHT_TWIPS = 16838;
const DEFAULT_FONT = "Arial";
const DEFAULT_FONT_SIZE = 24;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_WIDTH_PX = 1200;
const IMAGE_TIMEOUT_MS = 8000;

const ALLOWED_TAGS = [
  ...sanitizeHtml.defaults.allowedTags,
  "img", "h1", "h2", "h3", "h4", "h5", "h6", "table", "thead", "tbody",
  "tr", "th", "td", "pre", "code", "blockquote", "hr", "div", "span", "mark",
  "u", "s", "del", "ins", "input",
];

const ALLOWED_ATTRIBUTES = {
  ...sanitizeHtml.defaults.allowedAttributes,
  "*": ["style", "class", "align", "data-page-break", "data-type", "data-list-style"],
  a: ["href", "title", "style"],
  img: ["src", "alt", "width", "height", "style", "data-asset-id"],
  input: ["type", "checked", "disabled"],
  table: ["style", "border", "cellpadding", "cellspacing", "width"],
  td: ["style", "colspan", "rowspan", "width", "background", "align"],
  th: ["style", "colspan", "rowspan", "width", "background", "align"],
  ol: ["style", "start", "type"],
  ul: ["style", "type"],
  li: ["style", "value"],
};

const BLOCK_TAGS = new Set([
  "p", "div", "h1", "h2", "h3", "h4", "h5", "h6", "ul", "ol", "table",
  "blockquote", "pre", "hr", "img",
]);

function parseStyle(value = "") {
  if (!value || typeof value !== "string") return {};
  const style = {};
  for (const declaration of value.split(";")) {
    const separator = declaration.indexOf(":");
    if (separator < 1) continue;
    const property = declaration.slice(0, separator).trim().toLowerCase();
    const cssValue = declaration.slice(separator + 1).trim();
    if (property && cssValue) style[property] = cssValue;
  }
  return style;
}

function mergeStyle($, element, inherited = {}) {
  return { ...inherited, ...parseStyle($(element).attr("style")) };
}

function cssLengthToTwips(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const match = String(value).trim().match(/^(-?(?:\d+|\d*\.\d+))(px|pt|in|cm|mm|em|rem)?$/i);
  if (!match) return fallback;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return fallback;
  const unit = (match[2] || "px").toLowerCase();
  const multipliers = { px: 15, pt: 20, in: 1440, cm: 1440 / 2.54, mm: 1440 / 25.4, em: 240, rem: 240 };
  return Math.round(amount * multipliers[unit]);
}

function cssLengthToPixels(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  const match = String(value).trim().match(/^(\d+(?:\.\d+)?)(px|pt|in|cm|mm)?$/i);
  if (!match) return fallback;
  const amount = Number(match[1]);
  const unit = (match[2] || "px").toLowerCase();
  const multipliers = { px: 1, pt: 96 / 72, in: 96, cm: 96 / 2.54, mm: 96 / 25.4 };
  return Number.isFinite(amount) ? amount * multipliers[unit] : fallback;
}

function color(value) {
  if (!value) return undefined;
  const normalized = String(value).trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/i.test(normalized)) return normalized.slice(1).toUpperCase();
  if (/^#[0-9a-f]{3}$/i.test(normalized)) {
    return normalized.slice(1).split("").map((part) => part + part).join("").toUpperCase();
  }
  const rgb = normalized.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/);
  if (!rgb) return undefined;
  return rgb.slice(1).map((part) => Math.max(0, Math.min(255, Number(part))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

function fontSize(style) {
  const pixels = cssLengthToPixels(style["font-size"], 16);
  return Math.max(2, Math.round(pixels * 0.75 * 2));
}

function alignment(style, attribute) {
  const value = (style["text-align"] || attribute || "left").toLowerCase();
  if (value === "center") return AlignmentType.CENTER;
  if (value === "right" || value === "end") return AlignmentType.RIGHT;
  if (value === "justify") return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function paragraphSpacing(style, { suppressTopMargin = false } = {}) {
  const spacing = {};
  const before = suppressTopMargin ? 0 : cssLengthToTwips(style["margin-top"]);
  const after = cssLengthToTwips(style["margin-bottom"]);
  if (before !== undefined) spacing.before = Math.max(0, before);
  if (after !== undefined) spacing.after = Math.max(0, after);
  const lineHeight = style["line-height"];
  if (lineHeight) {
    const numeric = Number(lineHeight);
    const line = Number.isFinite(numeric)
      ? Math.round((fontSize(style) / 2) * numeric * 20)
      : cssLengthToTwips(lineHeight);
    if (line !== undefined) spacing.line = Math.max(1, line);
  }
  return spacing;
}

function paragraphIndent(style) {
  const left = cssLengthToTwips(style["margin-left"]);
  const right = cssLengthToTwips(style["margin-right"]);
  const firstLine = cssLengthToTwips(style["text-indent"]);
  if (left === undefined && right === undefined && firstLine === undefined) return undefined;
  return {
    ...(left === undefined ? {} : { left }),
    ...(right === undefined ? {} : { right }),
    ...(firstLine === undefined ? {} : { firstLine }),
  };
}

function canUseLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function runForText(text, style, marks = {}) {
  const decoration = style["text-decoration"] || "";
  const background = color(style["background-color"]);
  return new TextRun({
    text,
    font: style["font-family"]?.replace(/["']/g, "").split(",")[0].trim() || DEFAULT_FONT,
    size: fontSize(style),
    bold: marks.bold || style["font-weight"] === "bold" || Number(style["font-weight"]) >= 600,
    italics: marks.italics || style["font-style"] === "italic",
    underline: marks.underline || decoration.includes("underline") ? {} : undefined,
    strike: marks.strike || decoration.includes("line-through"),
    color: color(style.color),
    shading: background ? { type: ShadingType.CLEAR, fill: background } : undefined,
  });
}

function inheritedTextStyle($, element) {
  const inheritable = ["font-family", "font-size", "font-weight", "font-style", "color", "text-decoration", "line-height"];
  return $(element).parents().toArray().reverse().concat(element).reduce((result, node) => {
    const css = parseStyle($(node).attr("style"));
    for (const property of inheritable) if (css[property]) result[property] = css[property];
    return result;
  }, {});
}

function inlineChildren($, parent, style = {}, marks = {}) {
  const children = [];
  $(parent).contents().each((_, node) => {
    if (node.type === "text") {
      if (node.data) children.push(runForText(node.data, style, marks));
      return;
    }
    if (node.type !== "tag") return;
    if (node.name === "br") {
      children.push(new TextRun({ break: 1 }));
      return;
    }
    const nextStyle = mergeStyle($, node, style);
    const nextMarks = { ...marks };
    if (["b", "strong"].includes(node.name)) nextMarks.bold = true;
    if (["i", "em"].includes(node.name)) nextMarks.italics = true;
    if (node.name === "u") nextMarks.underline = true;
    if (["s", "del", "strike"].includes(node.name)) nextMarks.strike = true;
    const nested = inlineChildren($, node, nextStyle, nextMarks);
    if (node.name === "a" && canUseLink($(node).attr("href"))) {
      children.push(new ExternalHyperlink({ link: $(node).attr("href"), children: nested }));
    } else children.push(...nested);
  });
  return children;
}

function paragraphFor($, element, options = {}) {
  const style = mergeStyle($, element, inheritedTextStyle($, element));
  const children = inlineChildren($, element, style, options.heading ? { bold: true } : {});
  const background = color(style["background-color"]);
  return new Paragraph({
    children: children.length ? children : [new TextRun("")],
    alignment: alignment(style, $(element).attr("align")),
    spacing: paragraphSpacing(style, { suppressTopMargin: options.suppressTopMargin }),
    indent: paragraphIndent(style),
    shading: background ? { type: ShadingType.CLEAR, fill: background } : undefined,
    border: options.border,
    bullet: options.bullet,
    numbering: options.numbering,
    pageBreakBefore: options.pageBreakBefore,
    keepNext: options.keepNext,
  });
}

/**
 * Returns true if the URL is safe to fetch from the server side.
 *
 * The previous approach used an allowlist of known S3 hostnames, which silently
 * dropped every image inserted via an external URL. We now block SSRF targets
 * (private/loopback/link-local IP ranges and internal hostnames) instead, so
 * external images can be fetched while the server is still protected.
 */
function permittedImageHost(url) {
  const host = url.hostname.toLowerCase();

  // Block plain IP literals that fall into private / loopback / link-local ranges.
  // We check these as strings to avoid a dns lookup; numeric IP literals in URLs
  // are the primary SSRF vector.
  const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [, a, b] = ipv4.map(Number);
    // 10.x.x.x, 172.16-31.x.x, 192.168.x.x, 127.x.x.x, 169.254.x.x, 0.x.x.x
    if (a === 10 || a === 127 || a === 0) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 169 && b === 254) return false;
    return true;
  }

  // Block localhost and .local / .internal / .localhost TLDs.
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".localhost")) return false;

  // Block IPv6 literals (brackets stripped by URL parser → stored as ::1 etc.)
  if (host === "::1" || host.startsWith("[")) return false;

  // Everything else (public hostnames, AWS S3, CDNs, etc.) is permitted.
  return true;
}

async function fetchImage(source) {
  if (source.startsWith("data:")) {
    const match = source.match(/^data:(image\/(?:png|jpeg|gif|bmp|svg\+xml));base64,([\s\S]+)$/i);
    if (!match) return null;
    const bytes = Buffer.from(match[2], "base64");
    return bytes.length && bytes.length <= MAX_IMAGE_BYTES ? { bytes, mime: match[1].toLowerCase() } : null;
  }
  let url;
  try { url = new URL(source); } catch { return null; }
  // Only allow https to prevent fetching plaintext or local services.
  if (url.protocol !== "https:") return null;
  if (!permittedImageHost(url)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
  try {
    // Use redirect:"follow" — S3 presigned URLs can issue redirects.
    const response = await fetch(url, { signal: controller.signal, redirect: "follow" });
    if (!response.ok) return null;
    const contentType = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    if (!contentType.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) return null;
    return { bytes, mime: contentType };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function imageType(mime, bytes) {
  if (mime === "image/png" || bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (["image/jpeg", "image/jpg"].includes(mime) || (bytes[0] === 0xff && bytes[1] === 0xd8)) return "jpg";
  if (mime === "image/gif" || bytes.toString("ascii", 0, 3) === "GIF") return "gif";
  if (mime === "image/bmp") return "bmp";
  if (mime === "image/webp" || (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP")) return "webp";
  if (mime === "image/svg+xml" || /^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(bytes.toString("utf8", 0, Math.min(bytes.length, 1024)))) return "svg";
  return null;
}

function svgDimensions(bytes) {
  const svg = bytes.toString("utf8", 0, Math.min(bytes.length, 64 * 1024));
  const width = cssLengthToPixels(svg.match(/\bwidth=["']([^"']+)/i)?.[1]);
  const height = cssLengthToPixels(svg.match(/\bheight=["']([^"']+)/i)?.[1]);
  if (width && height) return { width, height };
  const viewBox = svg.match(/\bviewBox=["']\s*[\d.+-]+[ ,]+[\d.+-]+[ ,]+([\d.+-]+)[ ,]+([\d.+-]+)\s*["']/i);
  if (viewBox && Number(viewBox[1]) > 0 && Number(viewBox[2]) > 0) {
    return { width: Number(viewBox[1]), height: Number(viewBox[2]) };
  }
  return { width: 300, height: 150 };
}

function isSafeSvg(bytes) {
  const svg = bytes.toString("utf8", 0, Math.min(bytes.length, 512 * 1024));

  // Must start with an <svg> root element.
  if (!/^\s*(?:<\?xml[^>]*>\s*)?<svg[\s>]/i.test(svg)) return false;

  // Block dangerous tags that can execute scripts or load external content.
  // <use> is intentionally excluded from this list — it's safe when it only
  // references internal fragment IDs (see the href check below).
  if (/<(?:script|foreignObject|iframe|object|embed)\b/i.test(svg)) return false;

  // Block the SVG <image> element — it can reference external URLs.
  // (<use> is allowed; it's checked separately below.)
  if (/<image\b/i.test(svg)) return false;

  // Block inline event handlers (onclick, onload, etc.)
  if (/\son[a-z]+\s*=/i.test(svg)) return false;

  // Block @import inside <style> blocks.
  if (/@import\b/i.test(svg)) return false;

  // Block any href / xlink:href that points outside the document.
  // Internal fragment references like href="#mySymbol" are fine.
  if (/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i.test(svg)) return false;

  return true;
}

async function rasterizeBrowserImage(bytes, mime, dimensions) {
  if (mime === "image/svg+xml" && !isSafeSvg(bytes)) return null;
  const scale = Math.min(1, MAX_IMAGE_WIDTH_PX / dimensions.width, MAX_IMAGE_WIDTH_PX / dimensions.height);
  const width = Math.max(1, Math.round(dimensions.width * scale));
  const height = Math.max(1, Math.round(dimensions.height * scale));
  let browser;
  try {
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });

    if (mime === "image/svg+xml") {
      // Render SVG directly as page content rather than inside an <img> tag.
      // Chromium's image decoder may report naturalWidth=0 for SVGs loaded via
      // data URL in an <img>, but setting the SVG as page body content is
      // fully supported and renders correctly.
      const svgContent = bytes.toString("utf8");
      await page.setContent(
        `<!doctype html><html><head><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { width: ${width}px; height: ${height}px; overflow: hidden; background: transparent; }
          svg { width: ${width}px; height: ${height}px; display: block; }
        </style></head><body>${svgContent}</body></html>`,
        { waitUntil: "load" }
      );
      // Give fonts / layout a tick to settle.
      await page.evaluate(() => document.fonts.ready);
    } else {
      const source = `data:${mime};base64,${bytes.toString("base64")}`;
      await page.setContent(`<img id="image" src="${source}" width="${width}" height="${height}" style="display:block" />`);
      await page.waitForFunction(() => {
        const image = document.getElementById("image");
        return image?.complete && image.naturalWidth > 0;
      }, { timeout: IMAGE_TIMEOUT_MS });
    }

    return await page.screenshot({ type: "png", omitBackground: true, clip: { x: 0, y: 0, width, height } });
  } catch {
    return null;
  } finally {
    if (browser) await browser.close();
  }
}

async function imageParagraph($, element, contentWidthPx) {
  const source = $(element).attr("src");
  if (!source) return null;
  const image = await fetchImage(source);
  if (!image) {
    console.error("[docxExport] fetchImage returned null for src:", source?.slice(0, 120));
    return null;
  }
  let type = imageType(image.mime, image.bytes);
  if (!type) {
    console.error("[docxExport] imageType returned null — mime:", image.mime, "first bytes:", image.bytes.subarray(0, 16).toString("hex"));
    return null;
  }
  let sourceSize;
  try { sourceSize = imageSize(image.bytes); } catch {
    if (type !== "svg") return null;
    sourceSize = svgDimensions(image.bytes);
  }
  if (!sourceSize.width || !sourceSize.height) return null;
  if (type === "svg" || type === "webp") {
    console.log("[docxExport] rasterizing", type, "— dimensions:", sourceSize);
    const png = await rasterizeBrowserImage(image.bytes, type === "svg" ? "image/svg+xml" : "image/webp", sourceSize);
    if (!png) {
      console.error("[docxExport] rasterizeBrowserImage returned null for", type, "— isSafe:", type === "svg" ? isSafeSvg(image.bytes) : "n/a");
      return null;
    }
    image.bytes = png;
    image.mime = "image/png";
    type = "png";
  }
  const style = mergeStyle($, element);
  const requestedWidth = cssLengthToPixels($(element).attr("width") || style.width, sourceSize.width);
  const requestedHeight = cssLengthToPixels($(element).attr("height") || style.height, requestedWidth * sourceSize.height / sourceSize.width);
  const scale = Math.min(1, contentWidthPx / requestedWidth, MAX_IMAGE_WIDTH_PX / requestedWidth);
  const width = Math.max(1, Math.round(requestedWidth * scale));
  const height = Math.max(1, Math.round(requestedHeight * scale));
  const wrapper = $(element).closest(".image-wrapper").get(0);
  const wrapperStyle = wrapper ? parseStyle($(wrapper).attr("style")) : {};
  return new Paragraph({
    children: [new ImageRun({
      data: image.bytes,
      type,
      transformation: { width, height },
      altText: { name: $(element).attr("alt") || "Image", description: $(element).attr("alt") || "" },
    })],
    alignment: alignment({ "text-align": wrapperStyle["text-align"] || style["text-align"] || "center" }),
    spacing: { before: 360, after: 360 },
  });
}

function listDefinition(reference, format, text) {
  return {
    reference,
    levels: Array.from({ length: 9 }, (_, level) => ({
      level,
      format,
      text: text(level),
      alignment: AlignmentType.LEFT,
      style: { paragraph: { indent: { left: 720 + level * 360, hanging: 360 } } },
    })),
  };
}

const LIST_DEFINITIONS = [
  listDefinition("ordered-decimal", LevelFormat.DECIMAL, (level) => `%${level + 1}.`),
  listDefinition("ordered-lower-alpha", LevelFormat.LOWER_LETTER, (level) => `%${level + 1}.`),
  listDefinition("ordered-upper-alpha", LevelFormat.UPPER_LETTER, (level) => `%${level + 1}.`),
  listDefinition("ordered-lower-roman", LevelFormat.LOWER_ROMAN, (level) => `%${level + 1}.`),
  listDefinition("ordered-upper-roman", LevelFormat.UPPER_ROMAN, (level) => `%${level + 1}.`),
  listDefinition("bullet-disc", LevelFormat.BULLET, () => "•"),
  listDefinition("bullet-circle", LevelFormat.BULLET, () => "○"),
  listDefinition("bullet-square", LevelFormat.BULLET, () => "▪"),
];

function listReference($, element) {
  const ordered = element.name === "ol";
  const requested = $(element).attr("data-list-style") || $(element).attr("type") || "";
  if (!ordered) return `bullet-${requested === "circle" || requested === "square" ? requested : "disc"}`;
  const styles = {
    "lower-alpha": "ordered-lower-alpha", a: "ordered-lower-alpha",
    "upper-alpha": "ordered-upper-alpha", A: "ordered-upper-alpha",
    "lower-roman": "ordered-lower-roman", i: "ordered-lower-roman",
    "upper-roman": "ordered-upper-roman", I: "ordered-upper-roman",
  };
  return styles[requested] || "ordered-decimal";
}

async function convertList($, element, context, depth = 0) {
  const output = [];
  const ordered = element.name === "ol";
  const taskList = $(element).attr("data-type") === "taskList";
  const reference = listReference($, element);
  for (const item of $(element).children("li").toArray()) {
    const itemStyle = mergeStyle($, item, inheritedTextStyle($, item));
    const inline = [];
    $(item).contents().each((_, child) => {
      if (child.type === "tag" && ["ul", "ol", "label"].includes(child.name)) return;
      if (child.type === "tag" && BLOCK_TAGS.has(child.name) && child.name !== "img") {
        inline.push(...inlineChildren($, child, mergeStyle($, child, itemStyle)));
      } else if (child.type === "text") {
        if (child.data) inline.push(runForText(child.data, itemStyle));
      } else if (child.type === "tag") {
        inline.push(...inlineChildren($, child, mergeStyle($, child, itemStyle)));
      }
    });
    if (taskList) {
      const checked = $(item).find('input[type="checkbox"]').is("[checked]");
      inline.unshift(runForText(checked ? "☑ " : "☐ ", itemStyle));
    }
    output.push(new Paragraph({
      children: inline.length ? inline : [new TextRun("")],
      numbering: !taskList ? { reference, level: Math.min(depth, 8) } : undefined,
      indent: taskList ? { left: 360 + depth * 360 } : undefined,
      spacing: paragraphSpacing(itemStyle),
    }));
    for (const nested of $(item).children("ul, ol").toArray()) output.push(...await convertList($, nested, context, Math.min(depth + 1, 8)));
  }
  return output;
}

function tableBorders() {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "000000" };
  return { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };
}

async function tableCellChildren($, cell, context) {
  const output = [];
  for (const child of $(cell).contents().toArray()) {
    if (child.type === "text" && child.data.trim()) output.push(new Paragraph({ children: [runForText(child.data, mergeStyle($, cell, inheritedTextStyle($, cell)))] }));
    else if (child.type === "tag") output.push(...await convertElement($, child, context));
  }
  return output.length ? output : [new Paragraph("")];
}

async function convertTable($, element, context) {
  const rows = [];
  let columns = 1;
  for (const row of $(element).find("tr").toArray()) {
    const cells = [];
    let rowColumns = 0;
    for (const cell of $(row).children("th, td").toArray()) {
      const style = mergeStyle($, cell);
      const fill = color(style["background-color"] || $(cell).attr("background"));
      const vertical = (style["vertical-align"] || "top").toLowerCase();
      const span = Number($(cell).attr("colspan")) || 1;
      rowColumns += span;
      cells.push(new TableCell({
        children: await tableCellChildren($, cell, context),
        columnSpan: span,
        rowSpan: Number($(cell).attr("rowspan")) || 1,
        shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
        verticalAlign: vertical === "middle" || vertical === "center" ? VerticalAlign.CENTER : vertical === "bottom" ? VerticalAlign.BOTTOM : VerticalAlign.TOP,
        margins: { top: 90, bottom: 90, left: 120, right: 120 },
      }));
    }
    columns = Math.max(columns, rowColumns);
    if (cells.length) rows.push(new TableRow({ children: cells, cantSplit: true }));
  }
  return new Table({
    rows: rows.length ? rows : [new TableRow({ children: [new TableCell({ children: [new Paragraph("")] })] })],
    width: { size: context.contentWidth, type: WidthType.DXA },
    columnWidths: Array.from({ length: columns }, () => Math.floor(context.contentWidth / columns)),
    borders: tableBorders(),
  });
}

async function convertContainer($, element, context) {
  const directBlocks = $(element).children().toArray().filter((child) => BLOCK_TAGS.has(child.name));
  if (!directBlocks.length) return [paragraphFor($, element)];
  const output = [];
  for (const child of directBlocks) output.push(...await convertElement($, child, context));
  return output;
}

async function convertElement($, element, context, options = {}) {
  const tag = element.name;
  const classes = ($(element).attr("class") || "").split(/\s+/);
  if (tag === "div" && ($(element).is("[data-page-break]") || classes.includes("page-break") || $(element).attr("data-type") === "pageBreak")) {
    return [new Paragraph({ children: [new TextRun("")], pageBreakBefore: true })];
  }
  if (tag === "img") {
    const paragraph = await imageParagraph($, element, context.contentWidth / 15);
    return paragraph ? [paragraph] : [];
  }
  if (tag === "div") return convertContainer($, element, context);
  if (tag === "p") return [paragraphFor($, element)];
  if (/^h[1-6]$/.test(tag)) return [paragraphFor($, element, {
    heading: true,
    keepNext: true,
    suppressTopMargin: options.isFirstBlock,
  })];
  if (tag === "ul" || tag === "ol") return convertList($, element, context);
  if (tag === "table") return [await convertTable($, element, context)];
  if (tag === "blockquote") return [paragraphFor($, element, { border: { left: { color: "A0A0A0", space: 8, style: BorderStyle.SINGLE, size: 12 } } })];
  if (tag === "pre") return [new Paragraph({ children: [new TextRun({ text: $(element).text(), font: "Courier New", size: 20 })], shading: { type: ShadingType.CLEAR, fill: "F1F5F9" }, spacing: paragraphSpacing(mergeStyle($, element)) })];
  if (tag === "hr") return [new Paragraph({ children: [new TextRun("")], border: { bottom: { color: "808080", style: BorderStyle.SINGLE, size: 4, space: 1 } } })];
  return [];
}

function normalizeMargins(margins) {
  const toTwips = (pixels) => Math.round(pixels * 15);
  return { top: toTwips(margins.top), right: toTwips(margins.right), bottom: toTwips(margins.bottom), left: toTwips(margins.left), header: 0, footer: 0, gutter: 0 };
}

/** Converts the complete styled HTML document from the PDF route into native DOCX content. */
export async function convertHtmlToDocx({ html, margins }) {
  const source = load(html);
  const styleSheets = source("style").toArray().map((style) => source(style).text()).join("\n");
  const body = source("body").length ? source("body").html() : html;
  const sanitizedBody = sanitizeHtml(body, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ["http", "https", "data", "mailto"],
    allowedSchemesByTag: { img: ["http", "https", "data"] },
    disallowedTagsMode: "discard",
  });
  const inlinedHtml = juice(`<!doctype html><html><head><style>${styleSheets}</style></head><body>${sanitizedBody}</body></html>`, {
    applyStyleTags: true,
    removeStyleTags: true,
    preserveMediaQueries: false,
    preserveFontFaces: false,
  });
  const $ = load(inlinedHtml);
  const root = $(".tiptap-print").get(0) || $("body").get(0);
  const pageMargins = normalizeMargins(margins);
  const context = { contentWidth: Math.max(1440, A4_WIDTH_TWIPS - pageMargins.left - pageMargins.right) };
  const children = [];
  for (const [index, element] of $(root).children().toArray().entries()) {
    children.push(...await convertElement($, element, context, { isFirstBlock: index === 0 }));
  }
  if (!children.length) children.push(new Paragraph(""));
  const document = new Document({
    creator: "Document editor",
    styles: { default: { document: { run: { font: DEFAULT_FONT, size: DEFAULT_FONT_SIZE } } } },
    numbering: { config: LIST_DEFINITIONS },
    sections: [{ properties: { page: { size: { width: A4_WIDTH_TWIPS, height: A4_HEIGHT_TWIPS }, margin: pageMargins } }, children }],
  });
  return Packer.toBuffer(document);
}
