import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BetweenVerticalStartIcon,
  BetweenVerticalEndIcon,
  BetweenHorizontalStartIcon,
  BetweenHorizontalEndIcon,
  Columns3Icon,
  Rows3Icon,
  MergeIcon,
  SplitIcon,
  PanelTopIcon,
  PanelLeftIcon,
  Trash2Icon,
} from "lucide-react";
import { cn } from "@/lib/utils";

const IconBtn = ({ Icon, label, onClick, variant }) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onClick={onClick}
    className={cn(
      "inline-flex size-8 items-center justify-center rounded-md transition-colors",
      variant === "danger"
        ? "text-red-600 hover:bg-red-50"
        : "text-slate-600 hover:bg-slate-100 hover:text-[#0b57d0]"
    )}
  >
    <Icon size={16} strokeWidth={2} />
  </button>
);

const Divider = () => <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200" />;

const TableContextMenu = ({ position, onClose, editor }) => {
  const menuRef = useRef(null);
  const [coords, setCoords] = useState({ x: position.x, y: position.y });

  // Measure after paint and clamp so the menu never leaves the viewport
  useLayoutEffect(() => {
    const el = menuRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const pad = 8;
    let x = position.x;
    let y = position.y;

    if (x + rect.width > window.innerWidth - pad) {
      x = window.innerWidth - rect.width - pad;
    }
    if (y + rect.height > window.innerHeight - pad) {
      y = window.innerHeight - rect.height - pad;
    }
    x = Math.max(pad, x);
    y = Math.max(pad, y);

    setCoords({ x, y });
  }, [position.x, position.y]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };

    const handleEscape = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const run = (command) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (typeof chain[command] === "function") {
      chain[command]().run();
    }
    onClose();
  };

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        zIndex: 9999,
      }}
      className="flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white px-1.5 py-1.5 shadow-xl ring-1 ring-black/5"
    >
      {/* Columns */}
      <IconBtn
        Icon={BetweenVerticalStartIcon}
        label="Insert column before"
        onClick={() => run("addColumnBefore")}
      />
      <IconBtn
        Icon={BetweenVerticalEndIcon}
        label="Insert column after"
        onClick={() => run("addColumnAfter")}
      />
      <IconBtn
        Icon={Columns3Icon}
        label="Delete column"
        onClick={() => run("deleteColumn")}
        variant="danger"
      />

      <Divider />

      {/* Rows */}
      <IconBtn
        Icon={BetweenHorizontalStartIcon}
        label="Insert row before"
        onClick={() => run("addRowBefore")}
      />
      <IconBtn
        Icon={BetweenHorizontalEndIcon}
        label="Insert row after"
        onClick={() => run("addRowAfter")}
      />
      <IconBtn
        Icon={Rows3Icon}
        label="Delete row"
        onClick={() => run("deleteRow")}
        variant="danger"
      />

      <Divider />

      {/* Cells */}
      <IconBtn
        Icon={MergeIcon}
        label="Merge cells"
        onClick={() => run("mergeCells")}
      />
      <IconBtn
        Icon={SplitIcon}
        label="Split cell"
        onClick={() => run("splitCell")}
      />

      <Divider />

      {/* Headers */}
      <IconBtn
        Icon={PanelTopIcon}
        label="Toggle header row"
        onClick={() => run("toggleHeaderRow")}
      />
      <IconBtn
        Icon={PanelLeftIcon}
        label="Toggle header column"
        onClick={() => run("toggleHeaderColumn")}
      />

      <Divider />

      {/* Delete table */}
      <IconBtn
        Icon={Trash2Icon}
        label="Delete table"
        onClick={() => run("deleteTable")}
        variant="danger"
      />
    </div>,
    document.body
  );
};

export default TableContextMenu;
