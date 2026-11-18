import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";
import { useEditorContext } from "../context/EditorContext";
import TableContextMenu from "./TableContextMenu";

/**
 * Floating table UI: ⋯ button on hover + right-click context menu.
 * Keeps TipTap's native TableView (and column resize) intact — no custom NodeView.
 */
const TableControls = () => {
  const editor = useEditorContext();
  const [menuButton, setMenuButton] = useState(null); // { top, left, tableEl }
  const [contextMenu, setContextMenu] = useState(null); // { x, y }
  const hideTimeoutRef = useRef(null);
  const buttonRef = useRef(null);
  const activeTableRef = useRef(null);

  const clearHideTimeout = () => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const hideMenuButton = useCallback(() => {
    setMenuButton(null);
    activeTableRef.current = null;
  }, []);

  const scheduleHide = useCallback(() => {
    clearHideTimeout();
    hideTimeoutRef.current = setTimeout(() => {
      hideMenuButton();
    }, 200);
  }, [hideMenuButton]);

  const positionButtonForTable = useCallback((tableEl) => {
    if (!tableEl) return;
    const rect = tableEl.getBoundingClientRect();
    const next = {
      top: Math.round(rect.top - 10),
      left: Math.round(rect.right - 18),
      tableEl,
    };
    activeTableRef.current = tableEl;
    setMenuButton((prev) => {
      if (
        prev &&
        prev.top === next.top &&
        prev.left === next.left &&
        prev.tableEl === next.tableEl
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  /** Move ProseMirror selection into the cell under client coords (or into the table). */
  const focusCellAt = useCallback(
    (clientX, clientY, fallbackTable) => {
      if (!editor) return;

      const coords = editor.view.posAtCoords({ left: clientX, top: clientY });
      if (coords) {
        editor.chain().focus().setTextSelection(coords.pos).run();
        return;
      }

      if (fallbackTable) {
        const cell = fallbackTable.querySelector("td, th");
        if (cell) {
          try {
            const pos = editor.view.posAtDOM(cell, 0);
            editor.chain().focus().setTextSelection(pos).run();
          } catch {
            // ignore — table may be mid-update
          }
        }
      }
    },
    [editor]
  );

  const openContextMenu = useCallback(
    (x, y, tableEl) => {
      focusCellAt(x, y, tableEl);
      // Final clamp happens in TableContextMenu after it measures itself
      setContextMenu({ x, y });
    },
    [focusCellAt]
  );

  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = (e) => {
      if (!editor.isEditable) return;
      const table = e.target?.closest?.("table");
      if (!table || !editorElement.contains(table)) return;

      clearHideTimeout();
      positionButtonForTable(table);
    };

    const handleMouseOut = (e) => {
      const table = e.target?.closest?.("table");
      if (!table) return;

      const related = e.relatedTarget;
      if (
        related &&
        (table.contains(related) || buttonRef.current?.contains(related))
      ) {
        return;
      }

      scheduleHide();
    };

    const handleContextMenu = (e) => {
      if (!editor.isEditable) return;

      const cell = e.target?.closest?.("td, th");
      if (!cell || !editorElement.contains(cell)) return;

      const table = cell.closest("table");
      if (!table) return;

      e.preventDefault();
      e.stopPropagation();

      positionButtonForTable(table);
      openContextMenu(e.clientX, e.clientY, table);
    };

    const handleScroll = () => {
      if (activeTableRef.current) {
        positionButtonForTable(activeTableRef.current);
      }
      // Close context menu on scroll — position would be stale
      setContextMenu(null);
    };

    const handleUpdate = () => {
      if (activeTableRef.current && document.contains(activeTableRef.current)) {
        positionButtonForTable(activeTableRef.current);
      } else {
        hideMenuButton();
      }
    };

    editorElement.addEventListener("mouseover", handleMouseOver);
    editorElement.addEventListener("mouseout", handleMouseOut);
    editorElement.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("scroll", handleScroll, true);
    editor.on("selectionUpdate", handleUpdate);
    editor.on("transaction", handleUpdate);

    return () => {
      editorElement.removeEventListener("mouseover", handleMouseOver);
      editorElement.removeEventListener("mouseout", handleMouseOut);
      editorElement.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("scroll", handleScroll, true);
      editor.off("selectionUpdate", handleUpdate);
      editor.off("transaction", handleUpdate);
      clearHideTimeout();
    };
  }, [editor, hideMenuButton, openContextMenu, positionButtonForTable, scheduleHide]);

  const handleMenuButtonClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const tableEl = menuButton?.tableEl || activeTableRef.current;
    if (!tableEl) return;

    const rect = e.currentTarget.getBoundingClientRect();
    openContextMenu(rect.left, rect.bottom + 4, tableEl);
  };

  if (!editor?.isEditable) return null;

  return (
    <>
      {menuButton &&
        createPortal(
          <button
            ref={buttonRef}
            type="button"
            className="table-menu-button table-menu-button--visible"
            style={{
              position: "fixed",
              top: `${menuButton.top}px`,
              left: `${menuButton.left}px`,
              zIndex: 50,
            }}
            onMouseEnter={clearHideTimeout}
            onMouseLeave={scheduleHide}
            onClick={handleMenuButtonClick}
            title="Table options"
            aria-label="Table options"
          >
            <MoreVertical size={16} />
          </button>,
          document.body
        )}

      {contextMenu && (
        <TableContextMenu
          position={contextMenu}
          onClose={() => setContextMenu(null)}
          editor={editor}
        />
      )}
    </>
  );
};

export default TableControls;
