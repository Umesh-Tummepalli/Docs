import { useEditorState } from "@tiptap/react";
import {
  AlignCenterIcon,
  AlignJustifyIcon,
  AlignLeftIcon,
  AlignRightIcon,
  ChevronDownIcon,
} from "lucide-react";

import { cn } from "@/lib/utils.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { useEditorContext } from "../context/EditorContext";

const alignments = [
  {
    label: "Align left",
    value: "left",
    Icon: AlignLeftIcon,
  },
  {
    label: "Align center",
    value: "center",
    Icon: AlignCenterIcon,
  },
  {
    label: "Align right",
    value: "right",
    Icon: AlignRightIcon,
  },
  {
    label: "Justify",
    value: "justify",
    Icon: AlignJustifyIcon,
  },
];

const AlignButton = () => {
  const editor = useEditorContext();

  const { activeAlignment } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return { activeAlignment: "left" };
      }

      const activeOption = alignments.find(
        ({ value }) => value !== "left" && currentEditor.isActive({ textAlign: value })
      );

      return { activeAlignment: activeOption?.value ?? "left" };
    },
  });

  const activeOption = alignments.find(({ value }) => value === activeAlignment) ?? alignments[0];
  const ActiveIcon = activeOption.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="mx-1 flex h-7 min-w-12 shrink-0 items-center justify-center rounded-md px-1.5 text-gray-700 transition-colors hover:bg-[#e2e7eb] data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0] cursor-pointer"
          title={activeOption.label}
          aria-label={activeOption.label}
        >
          <ActiveIcon size={16} className="shrink-0" />
          <ChevronDownIcon className="ml-1 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-40 p-1 flex flex-col gap-y-1 ring-0 bg-[#f9fbfd]">
        {alignments.map(({ label, value, Icon }) => {
          const active = activeAlignment === value;

          return (
            <button
              key={value}
              type="button"
              className={cn(
                "flex w-full items-center gap-x-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-[#e2e7eb] cursor-pointer",
                active && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
              )}
              onClick={() => {
                editor?.chain().focus().setTextAlign(value).run();
              }}
            >
              <Icon size={16} className="shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AlignButton;
