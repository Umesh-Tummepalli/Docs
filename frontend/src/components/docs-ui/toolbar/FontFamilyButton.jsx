import { useEditorState } from "@tiptap/react";
import { ChevronDownIcon } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { cn } from "@/lib/utils.js";
import { useEditorContext } from "../context/EditorContext";

const fonts = [
  { label: "Arial", value: "Arial" },
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Courier New", value: "Courier New" },
  { label: "Georgia", value: "Georgia" },
  { label: "Verdana", value: "Verdana" },
];

const FontFamilyButton = () => {
  const editor = useEditorContext();

  const { currentFontFamily } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      currentFontFamily: currentEditor?.getAttributes("textStyle").fontFamily || "Arial",
    }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="h-7 w-30 shrink-0 flex items-center justify-between rounded-md hover:bg-[#e2e7eb] px-1.5 mx-1 overflow-hidden text-sm transition-colors data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0] cursor-pointer">
          <span className="truncate text-sm whitespace-nowrap">{currentFontFamily}</span>
          <ChevronDownIcon className="ml-2 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-1 flex flex-col gap-y-1 ring-0 bg-[#f9fbfd]">
        {fonts.map(({ label, value }) => (
          <button
            key={value}
            className={cn(
              "flex items-center gap-x-2 px-2 py-1 rounded-md hover:bg-[#e2e7eb] transition-colors cursor-pointer text-left",
              currentFontFamily === value && "bg-[#d3e3fd] text-[#0b57d0]"
            )}
            style={{ fontFamily: value }}
            onClick={() => {
              editor?.chain().focus().setFontFamily(value).run();
            }}
          >
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FontFamilyButton;
