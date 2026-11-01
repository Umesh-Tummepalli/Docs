import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import {
  PAGE_HEIGHT,
  DEFAULT_MARGIN_TOP,
  DEFAULT_MARGIN_BOTTOM,
  PAGE_GAP,
} from '../pageConstants';

const paginationPluginKey = new PluginKey('pagination');

/**
 * Read the current margin values from CSS custom properties on :root.
 * Falls back to the shared defaults so it never returns NaN.
 */
function readMarginsFromCss() {
  const style = getComputedStyle(document.documentElement);
  const parse = (prop, fallback) => {
    const v = Number.parseFloat(style.getPropertyValue(prop));
    return Number.isFinite(v) ? v : fallback;
  };
  return {
    top: parse('--page-margin-top', DEFAULT_MARGIN_TOP),
    bottom: parse('--page-margin-bottom', DEFAULT_MARGIN_BOTTOM),
  };
}

/**
 * Compute the content height of a single page given the current margins.
 */
function contentHeight() {
  const { top, bottom } = readMarginsFromCss();
  return PAGE_HEIGHT - top - bottom;
}

/**
 * Walk the top-level blocks of the document, measure their rendered height,
 * and return an array of { pos, fill } objects describing where auto page
 * breaks should be inserted, plus the remaining height on the last page.
 *
 * `pos`  — the document position just before the block that starts a new page.
 * `fill` — remaining space on the previous page (used to size the spacer).
 */
function computeBreaks(view) {
  const maxH = contentHeight();
  if (maxH <= 0) return { breaks: [], lastPageUsed: 0 };

  const breaks = [];
  let used = 0;

  view.state.doc.forEach((node, offset) => {
    // Manual page break — reset the page.
    if (node.type.name === 'pageBreak') {
      if (used > 0) {
        breaks.push({ pos: offset, fill: maxH - used });
      }
      used = 0;
      return;
    }

    const dom = view.nodeDOM(offset);
    if (!dom || dom.nodeType !== 1) return;

    const style = getComputedStyle(dom);
    const blockHeight =
      dom.offsetHeight +
      parseFloat(style.marginTop) +
      parseFloat(style.marginBottom);

    if (used > 0 && used + blockHeight > maxH) {
      breaks.push({ pos: offset, fill: maxH - used });
      used = 0;
    }

    used += blockHeight;
  });

  return { breaks, lastPageUsed: used };
}

/**
 * Serialize breaks + lastPageUsed to a comparable string so we can detect changes cheaply.
 */
function breaksKey(breaks, lastPageUsed) {
  return breaks.map((b) => `${b.pos}:${b.fill}`).join('|') + `|last:${Math.round(lastPageUsed)}`;
}

/**
 * Build a DecorationSet from the break array.  Each decoration is a widget
 * placed just before the block that starts a new page.  The widget is a
 * non-editable div that visually represents the gap between pages.
 *
 * Each spacer accounts for:
 *   1. fill  — leftover content space on the ending page (white)
 *   2. bottom margin of the ending page (white)
 *   3. PAGE_GAP — visible canvas-coloured gap between pages
 *   4. top margin of the starting page (white)
 *
 * This gives every page the same top/bottom margins as the first page.
 */
function buildDecorations(breaks, lastPageUsed, doc) {
  const { top, bottom } = readMarginsFromCss();
  const maxH = contentHeight();
  const widgets = [];

  // ── Page-break spacers ────────────────────────────────────────────────────
  breaks.forEach((b, i) => {
    const spacer = document.createElement('div');
    spacer.className = 'page-break-spacer';
    spacer.contentEditable = 'false';
    spacer.setAttribute('data-page-spacer', 'true');

    const height = b.fill + bottom + PAGE_GAP + top;
    spacer.style.height = `${height}px`;
    spacer.style.marginLeft = `calc(-1 * var(--page-margin-left, 48px))`;
    spacer.style.marginRight = `calc(-1 * var(--page-margin-right, 48px))`;

    spacer.style.setProperty('--spacer-fill', `${b.fill}px`);
    spacer.style.setProperty('--spacer-bottom', `${bottom}px`);
    spacer.style.setProperty('--spacer-gap', `${PAGE_GAP}px`);
    spacer.style.setProperty('--spacer-top', `${top}px`);

    widgets.push(Decoration.widget(b.pos, spacer, {
      side: -1,
      key: `page-break-${i}`,
    }));
  });

  // ── Last-page filler ──────────────────────────────────────────────────────
  // Pad the bottom of the last page so it always appears full A4-height.
  //
  // Layout of the last page (top → bottom):
  //   .tiptap padding-top  (= top)           ← already rendered by CSS
  //   lastPageUsed                            ← actual content
  //   fillerHeight                            ← this decoration fills the rest
  //   .tiptap padding-bottom (= bottom)      ← already rendered by CSS
  //
  // Total must equal PAGE_HEIGHT (1123 px):
  //   top + lastPageUsed + fillerHeight + bottom = PAGE_HEIGHT
  //   → fillerHeight = PAGE_HEIGHT - top - bottom - lastPageUsed
  //                  = maxH - lastPageUsed
  //
  // NOTE: we do NOT add `bottom` here.  The spacers for intermediate pages
  // include bottom/top margin in their own height because they sit inside
  // the content flow and override those zones themselves.  But on the last
  // page .tiptap's own padding-bottom already provides the bottom margin,
  // so adding it again would make the page taller than A4.
  //
  // We skip the filler when lastPageUsed is 0 (empty doc or last break
  // landed exactly at a page boundary — the preceding spacer already closed
  // that page with its full bottom border).
  const fillerHeight = lastPageUsed > 0 ? maxH - lastPageUsed : 0;
  if (fillerHeight > 1) {
    const filler = document.createElement('div');
    filler.className = 'page-last-filler';
    filler.contentEditable = 'false';
    filler.setAttribute('data-last-filler', 'true');
    filler.style.height = `${fillerHeight}px`;
    filler.style.marginLeft = `calc(-1 * var(--page-margin-left, 48px))`;
    filler.style.marginRight = `calc(-1 * var(--page-margin-right, 48px))`;
    filler.style.pointerEvents = 'none';
    filler.style.userSelect = 'none';
    filler.style.display = 'block';

    // Append after the last top-level node in the document.
    // doc.content.size is the position just past the last node — correct for
    // a side:1 widget that should render after all content.
    // Using doc.content.size - 1 would land *inside* the last node and break
    // cursor positioning.
    widgets.push(Decoration.widget(doc.content.size, filler, {
      side: 1,
      key: 'last-page-filler',
    }));
  }

  if (!widgets.length) return DecorationSet.empty;
  return DecorationSet.create(doc, widgets);
}

/**
 * PaginationExtension — Tiptap extension that registers a ProseMirror plugin
 * for visual-only automatic page breaks.
 *
 * Breaks are computed locally on each client by measuring rendered block
 * heights.  Nothing is written to the Yjs document.
 */
export const PaginationExtension = Extension.create({
  name: 'pagination',

  addProseMirrorPlugins() {
    const plugin = new Plugin({
      key: paginationPluginKey,

      state: {
        init() {
          return { breaks: [], lastPageUsed: 0, decorations: DecorationSet.empty };
        },
        apply(tr, value) {
          // If a recompute transaction carries new breaks, use them.
          const meta = tr.getMeta(paginationPluginKey);
          if (meta) {
            return {
              breaks: meta.breaks,
              lastPageUsed: meta.lastPageUsed,
              decorations: buildDecorations(meta.breaks, meta.lastPageUsed, tr.doc),
            };
          }
          // Otherwise map existing decorations through the mapping.
          if (tr.docChanged) {
            return {
              breaks: value.breaks,
              lastPageUsed: value.lastPageUsed,
              decorations: value.decorations.map(tr.mapping, tr.doc),
            };
          }
          return value;
        },
      },

      props: {
        decorations(state) {
          return paginationPluginKey.getState(state)?.decorations;
        },
      },

      view(editorView) {
        let rafId = null;
        let prevKey = '';
        let marginObserver = null;

        const recompute = () => {
          rafId = requestAnimationFrame(() => {
            rafId = null;
            const { breaks, lastPageUsed } = computeBreaks(editorView);
            const key = breaksKey(breaks, lastPageUsed);
            if (key !== prevKey) {
              prevKey = key;
              const tr = editorView.state.tr.setMeta(paginationPluginKey, {
                breaks,
                lastPageUsed,
              });
              tr.setMeta('addToHistory', false);
              editorView.dispatch(tr);
            }
          });
        };

        // Observe the editor container for style changes (margin CSS vars)
        // using a MutationObserver on the documentElement's style attribute.
        marginObserver = new MutationObserver(() => {
          recompute();
        });
        marginObserver.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ['style'],
        });

        return {
          update() {
            recompute();
          },
          destroy() {
            if (rafId) cancelAnimationFrame(rafId);
            if (marginObserver) marginObserver.disconnect();
          },
        };
      },
    });

    return [plugin];
  },
});
