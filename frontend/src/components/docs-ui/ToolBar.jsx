import { useState } from "react";

import { useEditorState } from "@tiptap/react";
import {
  Bold,
  Italic,
  ListTodo,
  MessageSquarePlus,
  Printer,
  Redo2,
  RemoveFormattingIcon,
  SpellCheck,
  Underline,
  Undo2,
} from "lucide-react";

import { Separator } from "../ui/separator";
import { useEditorContext } from "./context/EditorContext";
import FontFamilyButton from "./toolbar/FontFamilyButton";
import HeadingButton from "./toolbar/HeadingButton";
import HighlightButton from "./toolbar/HighlightButton";
import TextColorButton from "./toolbar/TextColorButton";
import ToolbarButton from "./toolbar/ToolbarButton";
import LinkButton from "./toolbar/LinkButton";
import ImageButton from "./toolbar/ImageButton";
const ToolBar = () => {
  const editor = useEditorContext();
  const [spellcheckEnabled, setSpellcheckEnabled] = useState(true);

  const toggleSpellcheck = () => {
    if (!editor) return;

    const nextSpellcheck = !spellcheckEnabled;
    const editorDom = document
      .getElementById("document")
      ?.querySelector("[contenteditable='true']");

    editorDom?.setAttribute("spellcheck", String(nextSpellcheck));
    editorDom?.setAttribute("autocorrect", nextSpellcheck ? "on" : "off");
    editorDom?.setAttribute("lang", editorDom.getAttribute("lang") || "en-US");

    setSpellcheckEnabled(nextSpellcheck);
    editor.commands.focus();
  };

  const { canUndo, canRedo, isBoldActive, isItalicActive, isUnderlineActive, isTodoActive } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
      canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
      isBoldActive: currentEditor?.isActive("bold") ?? false,
      isItalicActive: currentEditor?.isActive("italic") ?? false,
      isUnderlineActive: currentEditor?.isActive("underline") ?? false,
      isTodoActive: currentEditor?.isActive("taskList") ?? false,
    }),
  });

  const sections = [
    [
      {
        label: "undo",
        Icon: Undo2,
        disabled: !canUndo,
        onClick: () => {
          editor?.chain().focus().undo().run();
        },
      },
      {
        label: "redo",
        Icon: Redo2,
        disabled: !canRedo,
        onClick: () => {
          editor?.chain().focus().redo().run();
        },
      },
      {
        label: "print",
        Icon: Printer,
        onClick: () => {
          window.print();
        },
      },
      {
        label: "spell-check",
        Icon: SpellCheck,
        isActive: spellcheckEnabled,
        onClick: toggleSpellcheck,
      },
    ],
    [
      {
        label: "bold",
        Icon: Bold,
        isActive: isBoldActive,
        onClick: () => {
          editor?.chain().focus().toggleBold().run();
        },
      },
      {
        label: "italic",
        Icon: Italic,
        isActive: isItalicActive,
        onClick: () => {
          editor?.chain().focus().toggleItalic().run();
        },
      },
      {
        label: "underline",
        Icon: Underline,
        isActive: isUnderlineActive,
        onClick: () => {
          editor?.chain().focus().toggleUnderline().run();
        },
      },
    ],
    [
      {
        label: "comment",
        Icon: MessageSquarePlus,
        onClick: () => {
          console.log("comment");
        },
      },
      {
        label: "todo",
        Icon: ListTodo,
        onClick: () => {
          editor?.chain().focus().toggleTaskList().run();
        },
        isActive: isTodoActive,
      },
      {
        label: "remove-formatting",
        Icon: RemoveFormattingIcon,
        onClick: () => {
          editor?.chain().focus().unsetAllMarks().clearNodes().run();
        },
      },
    ],
  ];

  return (
    <div className="sticky top-20 z-40">
      <div className="mx-auto flex w-fit max-w-full items-center rounded-full bg-[#f9fbfd] p-1 shadow-sm ring-1 ring-slate-200">
        <div className="flex items-center">
          {sections[0]?.map((item) => (
            <ToolbarButton key={item.label} {...item} />
          ))}
          <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300" />
        </div>
        
        <div className="flex items-center">
          {sections[1]?.map((item) => (
            <ToolbarButton key={item.label} {...item} />
          ))}
          <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300" />
        </div>
        <FontFamilyButton />
        <HeadingButton />
        <HighlightButton />
        <TextColorButton />
        <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300" />
        <LinkButton/>
        <ImageButton/>
        <div className="flex items-center">
          {sections[2]?.map((item) => (
            <ToolbarButton key={item.label} {...item} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ToolBar;
