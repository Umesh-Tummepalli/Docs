import { useEditorState } from "@tiptap/react";
import {
  ChevronDownIcon,
  ListIcon,
  ListOrderedIcon,
  ListTodoIcon,
  CircleIcon,
  SquareIcon,
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

const toggleBulletListWithStyle = (editor, style) => {
  if (editor.isActive("bulletList") && editor.getAttributes("bulletList").listStyleType === style) {
    editor.chain().focus().toggleBulletList().run();
  } else if (editor.isActive("bulletList")) {
    editor.chain().focus().updateAttributes("bulletList", { listStyleType: style }).run();
  } else {
    editor.chain().focus().toggleBulletList().updateAttributes("bulletList", { listStyleType: style }).run();
  }
};

const toggleOrderedListWithStyle = (editor, style) => {
  if (editor.isActive("orderedList") && editor.getAttributes("orderedList").listStyleType === style) {
    editor.chain().focus().toggleOrderedList().run();
  } else if (editor.isActive("orderedList")) {
    editor.chain().focus().updateAttributes("orderedList", { listStyleType: style }).run();
  } else {
    editor.chain().focus().toggleOrderedList().updateAttributes("orderedList", { listStyleType: style }).run();
  }
};

const listStyles = [
  {
    label: "Bulleted (Disc)",
    value: "bulletList_disc",
    type: "bulletList",
    style: "disc",
    Icon: ListIcon,
    command: (editor) => toggleBulletListWithStyle(editor, "disc"),
  },
  {
    label: "Bulleted (Circle)",
    value: "bulletList_circle",
    type: "bulletList",
    style: "circle",
    Icon: CircleIcon,
    command: (editor) => toggleBulletListWithStyle(editor, "circle"),
  },
  {
    label: "Bulleted (Square)",
    value: "bulletList_square",
    type: "bulletList",
    style: "square",
    Icon: SquareIcon,
    command: (editor) => toggleBulletListWithStyle(editor, "square"),
  },
  {
    label: "Numbered (1, 2, 3)",
    value: "orderedList_decimal",
    type: "orderedList",
    style: "decimal",
    Icon: ListOrderedIcon,
    command: (editor) => toggleOrderedListWithStyle(editor, "decimal"),
  },
  {
    label: "Numbered (a, b, c)",
    value: "orderedList_lower-alpha",
    type: "orderedList",
    style: "lower-alpha",
    Icon: ListOrderedIcon,
    command: (editor) => toggleOrderedListWithStyle(editor, "lower-alpha"),
  },
  {
    label: "Numbered (A, B, C)",
    value: "orderedList_upper-alpha",
    type: "orderedList",
    style: "upper-alpha",
    Icon: ListOrderedIcon,
    command: (editor) => toggleOrderedListWithStyle(editor, "upper-alpha"),
  },
  {
    label: "Numbered (i, ii, iii)",
    value: "orderedList_lower-roman",
    type: "orderedList",
    style: "lower-roman",
    Icon: ListOrderedIcon,
    command: (editor) => toggleOrderedListWithStyle(editor, "lower-roman"),
  },
  {
    label: "Numbered (I, II, III)",
    value: "orderedList_upper-roman",
    type: "orderedList",
    style: "upper-roman",
    Icon: ListOrderedIcon,
    command: (editor) => toggleOrderedListWithStyle(editor, "upper-roman"),
  },
  {
    label: "Checklist",
    value: "taskList",
    type: "taskList",
    style: null,
    Icon: ListTodoIcon,
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
];

const ListButton = () => {
  const editor = useEditorContext();

  const { activeListStyle, isListActive } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) {
        return {
          activeListStyle: "bulletList_disc",
          isListActive: false,
        };
      }

      let activeOption = null;

      if (currentEditor.isActive("taskList")) {
        activeOption = listStyles.find(({ value }) => value === "taskList");
      } else if (currentEditor.isActive("bulletList")) {
        const listStyleType = currentEditor.getAttributes("bulletList").listStyleType ?? "disc";
        activeOption = listStyles.find(({ type, style }) => type === "bulletList" && style === listStyleType)
          || listStyles.find(({ value }) => value === "bulletList_disc");
      } else if (currentEditor.isActive("orderedList")) {
        const listStyleType = currentEditor.getAttributes("orderedList").listStyleType ?? "decimal";
        activeOption = listStyles.find(({ type, style }) => type === "orderedList" && style === listStyleType)
          || listStyles.find(({ value }) => value === "orderedList_decimal");
      }

      return {
        activeListStyle: activeOption?.value ?? "bulletList_disc",
        isListActive: Boolean(activeOption),
      };
    },
  });

  const activeOption = listStyles.find(({ value }) => value === activeListStyle) ?? listStyles[0];
  const ActiveIcon = activeOption.Icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "mx-1 flex h-7 min-w-12 shrink-0 items-center justify-center rounded-md px-1.5 text-gray-700 transition-colors hover:bg-[#e2e7eb] data-[state=open]:bg-[#d3e3fd] data-[state=open]:text-[#0b57d0] cursor-pointer",
            isListActive && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
          )}
          title={activeOption.label}
          aria-label={activeOption.label}
          aria-pressed={isListActive}
        >
          <ActiveIcon size={16} className="shrink-0" />
          <ChevronDownIcon className="ml-1 size-4 shrink-0" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-48 p-1 flex flex-col gap-y-0.5 ring-0 bg-[#f9fbfd] border border-neutral-200 shadow-md">
        {/* Bullet Lists Section */}
        <DropdownMenuLabel className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2.5 py-1">
          Bulleted Lists
        </DropdownMenuLabel>
        {listStyles
          .filter((style) => style.type === "bulletList")
          .map(({ label, value, Icon, command }) => {
            const active = activeListStyle === value && isListActive;
            return (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex w-full items-center gap-x-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[#e2e7eb] cursor-pointer",
                  active && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
                )}
                onClick={() => command(editor)}
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}

        <DropdownMenuSeparator />

        {/* Numbered Lists Section */}
        <DropdownMenuLabel className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2.5 py-1">
          Numbered Lists
        </DropdownMenuLabel>
        {listStyles
          .filter((style) => style.type === "orderedList")
          .map(({ label, value, Icon, command }) => {
            const active = activeListStyle === value && isListActive;
            return (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex w-full items-center gap-x-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[#e2e7eb] cursor-pointer",
                  active && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
                )}
                onClick={() => command(editor)}
              >
                <Icon size={16} className="shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}

        <DropdownMenuSeparator />

        {/* Checklist Section */}
        <DropdownMenuLabel className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-2.5 py-1">
          Interactive Lists
        </DropdownMenuLabel>
        {listStyles
          .filter((style) => style.type === "taskList")
          .map(({ label, value, Icon, command }) => {
            const active = activeListStyle === value && isListActive;
            return (
              <button
                key={value}
                type="button"
                className={cn(
                  "flex w-full items-center gap-x-2 rounded-md px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-[#e2e7eb] cursor-pointer",
                  active && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
                )}
                onClick={() => command(editor)}
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

export default ListButton;
