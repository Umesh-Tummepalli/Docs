import { useEditorState } from "@tiptap/react";
import { ChevronDownIcon, ListChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { useEditorContext } from "../context/EditorContext";

const lineHeights = [
  { label: "1", value: "1" },
  { label: "1.15", value: "1.15" },
  { label: "1.5", value: "1.5" },
  { label: "2", value: "2" },
];

const LineHeightButton = () => {
  const editor = useEditorContext();

  const { currentLineHeight } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return { currentLineHeight: "1.5" };
      }

      const activeNode = currentEditor.isActive("heading") ? "heading" : "paragraph";

      return {
        currentLineHeight:
          currentEditor.getAttributes(activeNode).lineHeight || "1.5",
      };
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mx-1 flex h-7 min-w-12 shrink-0 items-center justify-center rounded-md px-1.5 text-gray-700 transition-colors hover:bg-[#e2e7eb] data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0] cursor-pointer"
          title="Line spacing"
          aria-label="Line spacing"
        >
          <ListChevronsUpDown size={16} className="shrink-0" />
          <ChevronDownIcon className="ml-1 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-32 p-1 flex flex-col gap-y-1 ring-0 bg-[#f9fbfd]">
        {lineHeights.map(({ label, value }) => {
          const active = currentLineHeight === value;

          return (
            <button
              key={value}
              type="button"
              className={cn(
                "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#e2e7eb] cursor-pointer",
                active && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
              )}
              onClick={() => {
                editor?.chain().focus().setLineHeight(value).run();
              }}
            >
              <span>{label}</span>
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LineHeightButton;
