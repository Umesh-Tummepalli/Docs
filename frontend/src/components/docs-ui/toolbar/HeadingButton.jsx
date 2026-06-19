import { useEditorState } from "@tiptap/react";
import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { cn } from "@/lib/utils.js";
import { useEditorContext } from "../context/EditorContext";

const options = [
  { label: "Normal text", value: "paragraph" },
  { label: "Heading 1", value: 1 },
  { label: "Heading 2", value: 2 },
  { label: "Heading 3", value: 3 },
  { label: "Heading 4", value: 4 },
  { label: "Heading 5", value: 5 },
];

const getFontSize = (value) => {
  if (value === "paragraph") return "14px";
  if (value === 1) return "32px";
  if (value === 2) return "24px";
  if (value === 3) return "20px";
  if (value === 4) return "16px";
  return "14px";
};

const HeadingButton = () => {
  const editor = useEditorContext();

  const { currentLabel, activeBlock } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return {
          currentLabel: "Normal text",
          activeBlock: "paragraph",
        };
      }

      const activeHeading = options.find(
        ({ value }) => typeof value === "number" && currentEditor.isActive("heading", { level: value })
      );

      if (activeHeading) {
        return {
          currentLabel: activeHeading.label,
          activeBlock: activeHeading.value,
        };
      }

      return {
        currentLabel: "Normal text",
        activeBlock: "paragraph",
      };
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-7 w-32 shrink-0 flex items-center justify-between rounded-md hover:bg-[#e2e7eb] px-1.5 mx-1 overflow-hidden text-sm transition-colors data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0] cursor-pointer">
          <span className="truncate">{currentLabel}</span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-col gap-y-1 ring-0 bg-[#f9fbfd]">
        {options.map(({ label, value }) => {
          const active = activeBlock === value;

          return (
            <button
              key={label}
              className={cn(
                "flex items-center gap-x-2 px-2 py-1 rounded-md hover:bg-[#e2e7eb] text-left transition-colors cursor-pointer",
                active && "bg-[#d3e3fd] text-[#0b57d0]"
              )}
              onClick={() => {
                if (value === "paragraph") {
                  editor?.chain().focus().setParagraph().run();
                } else {
                  editor?.chain().focus().setHeading({ level: value }).run();
                }
              }}
            >
              <span
                style={{
                  fontSize: getFontSize(value),
                }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default HeadingButton;
