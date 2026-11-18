import { useState, useCallback } from "react";
import { useEditorState } from "@tiptap/react";
import {
  ChevronDownIcon,
  TableIcon,
  PlusIcon,
  Trash2Icon,
  Columns3Icon,
  Rows3Icon,
  MergeIcon,
  SplitIcon,
  Grid2X2Icon,
  BetweenVerticalStartIcon,
  BetweenVerticalEndIcon,
  BetweenHorizontalStartIcon,
  BetweenHorizontalEndIcon,
  ToggleLeftIcon,
} from "lucide-react";

import { cn } from "@/lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../../ui/dropdown-menu";
import { useEditorContext } from "../context/EditorContext";

// ─── Grid picker ──────────────────────────────────────────────────────────────
const MAX_ROWS = 8;
const MAX_COLS = 8;

const GridPicker = ({ onSelect }) => {
  const [hover, setHover] = useState({ row: 0, col: 0 });
  const [customRows, setCustomRows] = useState("");
  const [customCols, setCustomCols] = useState("");

  const handleCustomInsert = () => {
    const rows = parseInt(customRows, 10);
    const cols = parseInt(customCols, 10);

    if (rows > 0 && cols > 0 && rows <= 100 && cols <= 20) {
      onSelect(rows, cols);
      setCustomRows("");
      setCustomCols("");
    }
  };

  const handleCustomKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCustomInsert();
    }
  };

  return (
    <div className="px-2 pb-2">
      <p className="mb-2 text-center text-xs font-medium text-slate-500">
        {hover.row > 0 ? `${hover.row} × ${hover.col}` : "Select size"}
      </p>
      <div
        className="inline-grid gap-[3px]"
        style={{ gridTemplateColumns: `repeat(${MAX_COLS}, 1fr)` }}
        onMouseLeave={() => setHover({ row: 0, col: 0 })}
      >
        {Array.from({ length: MAX_ROWS * MAX_COLS }, (_, i) => {
          const r = Math.floor(i / MAX_COLS) + 1;
          const c = (i % MAX_COLS) + 1;
          const active = r <= hover.row && c <= hover.col;
          return (
            <button
              key={i}
              type="button"
              className={cn(
                "size-[18px] rounded-[3px] border transition-colors cursor-pointer",
                active
                  ? "border-[#0b57d0] bg-[#d3e3fd]"
                  : "border-slate-300 bg-white hover:border-slate-400"
              )}
              onMouseEnter={() => setHover({ row: r, col: c })}
              onClick={() => onSelect(r, c)}
            />
          );
        })}
      </div>

      {/* Custom size inputs */}
      <div className="mt-3 pt-3 border-t border-slate-200">
        <p className="mb-2 text-xs font-medium text-slate-600">Custom size</p>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min="1"
            max="100"
            placeholder="Rows"
            value={customRows}
            onChange={(e) => setCustomRows(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b57d0] focus:border-transparent"
          />
          <span className="text-slate-400 font-medium">×</span>
          <input
            type="number"
            min="1"
            max="20"
            placeholder="Cols"
            value={customCols}
            onChange={(e) => setCustomCols(e.target.value)}
            onKeyDown={handleCustomKeyDown}
            className="w-full px-2 py-1.5 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0b57d0] focus:border-transparent"
          />
        </div>
        <button
          type="button"
          onClick={handleCustomInsert}
          disabled={!customRows || !customCols}
          className={cn(
            "mt-2 w-full px-3 py-1.5 text-sm font-medium rounded-md transition-colors",
            customRows && customCols
              ? "bg-[#0b57d0] text-white hover:bg-[#0b57d0]/90"
              : "bg-slate-100 text-slate-400 cursor-not-allowed"
          )}
        >
          Insert Table
        </button>
      </div>
    </div>
  );
};

// ─── Menu item helper ─────────────────────────────────────────────────────────
const MenuItem = ({ Icon, label, onClick, disabled, variant }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={cn(
      "flex w-full items-center gap-x-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors cursor-pointer",
      disabled
        ? "text-slate-300 cursor-not-allowed"
        : variant === "danger"
          ? "text-red-600 hover:bg-red-50"
          : "text-slate-700 hover:bg-[#e2e7eb]"
    )}
  >
    <Icon size={16} className="shrink-0" />
    <span>{label}</span>
  </button>
);

// ─── TableButton component ────────────────────────────────────────────────────
const TableButton = () => {
  const editor = useEditorContext();
  const [open, setOpen] = useState(false);

  const { isInTable } = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      isInTable: e?.isActive("table") ?? false,
    }),
  });

  const insertTable = useCallback(
    (rows, cols) => {
      editor
        ?.chain()
        .focus()
        .insertTable({ rows, cols, withHeaderRow: true })
        .run();
      setOpen(false);
    },
    [editor]
  );

  const run = useCallback(
    (command) => {
      editor?.chain().focus()[command]?.()?.run();
    },
    [editor]
  );

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "mx-1 flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md px-1.5 text-gray-700 transition-colors hover:bg-[#e2e7eb] cursor-pointer",
            "data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0]",
            isInTable && "bg-[#d3e3fd] text-[#0b57d0]"
          )}
          title="Table"
          aria-label="Table"
        >
          <Grid2X2Icon size={16} className="shrink-0" />
          <ChevronDownIcon className="ml-0.5 size-3.5 shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="w-64 p-1 ring-0 bg-[#f9fbfd]"
        align="start"
      >
        {!isInTable ? (
          <>
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
              Insert Table
            </DropdownMenuLabel>
            <GridPicker onSelect={insertTable} />
          </>
        ) : (
          <>
            {/* Column operations */}
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
              Columns
            </DropdownMenuLabel>
            <MenuItem
              Icon={BetweenVerticalStartIcon}
              label="Insert column before"
              onClick={() => run("addColumnBefore")}
            />
            <MenuItem
              Icon={BetweenVerticalEndIcon}
              label="Insert column after"
              onClick={() => run("addColumnAfter")}
            />
            <MenuItem
              Icon={Columns3Icon}
              label="Delete column"
              onClick={() => run("deleteColumn")}
              variant="danger"
            />

            <DropdownMenuSeparator className="my-1 bg-slate-200" />

            {/* Row operations */}
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
              Rows
            </DropdownMenuLabel>
            <MenuItem
              Icon={BetweenHorizontalStartIcon}
              label="Insert row before"
              onClick={() => run("addRowBefore")}
            />
            <MenuItem
              Icon={BetweenHorizontalEndIcon}
              label="Insert row after"
              onClick={() => run("addRowAfter")}
            />
            <MenuItem
              Icon={Rows3Icon}
              label="Delete row"
              onClick={() => run("deleteRow")}
              variant="danger"
            />

            <DropdownMenuSeparator className="my-1 bg-slate-200" />

            {/* Merge / Split */}
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-slate-500">
              Cells
            </DropdownMenuLabel>
            <MenuItem
              Icon={MergeIcon}
              label="Merge cells"
              onClick={() => run("mergeCells")}
            />
            <MenuItem
              Icon={SplitIcon}
              label="Split cell"
              onClick={() => run("splitCell")}
            />

            <DropdownMenuSeparator className="my-1 bg-slate-200" />

            {/* Toggle headers */}
            <MenuItem
              Icon={ToggleLeftIcon}
              label="Toggle header row"
              onClick={() => run("toggleHeaderRow")}
            />
            <MenuItem
              Icon={ToggleLeftIcon}
              label="Toggle header column"
              onClick={() => run("toggleHeaderColumn")}
            />

            <DropdownMenuSeparator className="my-1 bg-slate-200" />

            {/* Delete table */}
            <MenuItem
              Icon={Trash2Icon}
              label="Delete table"
              onClick={() => {
                run("deleteTable");
                setOpen(false);
              }}
              variant="danger"
            />
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default TableButton;
