import { LoaderCircle, ChevronDown, FileOutput } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ── Icons ─────────────────────────────────────────────────────────────────────
//
// Both icons share the same document-with-folded-corner outline.
// The PDF icon uses a small "PDF" badge rendered as a filled rect + text node
// (reliable at any size). The DOCX icon uses a "DOC" badge.

const PdfIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M14.5 2v5.5H20"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="3" y="13" width="11" height="6" rx="1" fill="#ef4444" />
    <text
      x="8.5"
      y="17.7"
      textAnchor="middle"
      fontSize="4.5"
      fontWeight="800"
      fontFamily="Arial, Helvetica, sans-serif"
      fill="white"
      letterSpacing="0.4"
    >
      PDF
    </text>
  </svg>
);

const DocxIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M14.5 2v5.5H20"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="3" y="13" width="11" height="6" rx="1" fill="#3b82f6" />
    <text
      x="8.5"
      y="17.7"
      textAnchor="middle"
      fontSize="4.5"
      fontWeight="800"
      fontFamily="Arial, Helvetica, sans-serif"
      fill="white"
      letterSpacing="0.4"
    >
      DOC
    </text>
  </svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

const ExportButton = ({
  onExportPdf,
  onExportDocx,
  isExportingPdf = false,
  isExportingDocx = false,
}) => {
  const isExporting = isExportingPdf || isExportingDocx;

  const itemClass = (isItemExporting) =>
    cn(
      "flex w-full items-center gap-x-2.5 rounded-md px-2 py-1.5 text-left text-sm cursor-pointer transition-colors",
      "hover:bg-[#e2e7eb] focus:bg-[#e2e7eb] focus:text-current",
      "data-[disabled]:opacity-100",
      isItemExporting && "bg-[#d3e3fd] text-[#0b57d0] focus:bg-[#d3e3fd] focus:text-[#0b57d0]"
    );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          disabled={isExporting}
          title="Export document"
          aria-label="Export document"
          className={cn(
            "h-7 flex items-center gap-0.5 rounded-md px-1.5 mx-1 transition-colors cursor-pointer",
            "hover:bg-[#e2e7eb]",
            "data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0]",
            isExporting && "opacity-40 pointer-events-none"
          )}
        >
          {isExporting
            ? <LoaderCircle size={14} className="animate-spin shrink-0" />
            : <FileOutput size={14} className="shrink-0" />
          }
          <span className="text-sm">Export</span>
          <ChevronDown size={13} className="shrink-0" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        sideOffset={4}
        className="min-w-[160px] p-1 flex flex-col gap-y-0.5 ring-0 bg-[#f9fbfd] shadow-md"
      >
        {/* PDF */}
        <DropdownMenuItem
          disabled={isExporting}
          onSelect={() => onExportPdf?.()}
          className={itemClass(isExportingPdf)}
        >
          {isExportingPdf
            ? <LoaderCircle size={15} className="animate-spin shrink-0" />
            : <PdfIcon />
          }
          <span>{isExportingPdf ? "Exporting…" : "Export as PDF"}</span>
        </DropdownMenuItem>

        {/* DOCX */}
        <DropdownMenuItem
          disabled={isExporting}
          onSelect={() => onExportDocx?.()}
          className={itemClass(isExportingDocx)}
        >
          {isExportingDocx
            ? <LoaderCircle size={15} className="animate-spin shrink-0" />
            : <DocxIcon />
          }
          <span>{isExportingDocx ? "Exporting…" : "Export as Word"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportButton;