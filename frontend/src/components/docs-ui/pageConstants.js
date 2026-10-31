// A4 at 96 DPI
export const PAGE_WIDTH = 794;
export const PAGE_HEIGHT = 1123;

// Default margins — these match the Puppeteer page.pdf() fallback values
// in backend/controller/document.js so editor and PDF never drift apart.
export const DEFAULT_MARGIN_TOP = 96;
export const DEFAULT_MARGIN_BOTTOM = 96;
export const DEFAULT_MARGIN_LEFT = 48;
export const DEFAULT_MARGIN_RIGHT = 48;

// Gap between visual pages in the editor (px)
export const PAGE_GAP = 32;

// Usable content height per page
export const getContentHeight = (marginTop = DEFAULT_MARGIN_TOP, marginBottom = DEFAULT_MARGIN_BOTTOM) =>
  PAGE_HEIGHT - marginTop - marginBottom;
