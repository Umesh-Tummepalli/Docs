import { useState } from "react"
import {cn} from "../../lib/utils"
import { Bold, Italic, Printer, Redo2, SpellCheck, Underline, Undo2 } from "lucide-react"
import { useEditorContext } from "./context/EditorContext"
import { useEditorState } from "@tiptap/react"
import {Separator} from "../ui/separator"
const ToolbarButton = ({ Icon, onClick = null, isActive = false, label, disabled = false }) => {

  return <>
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={isActive}
      disabled={disabled}
      className={cn(
        "h-7 min-w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] p-1 mx-1 transition-colors",
        isActive && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]",
        disabled && "opacity-40 pointer-events-none"
      )}
    >
      <Icon size={16}/>
    </button>
  </>
}

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

  const { canUndo, canRedo, isBoldActive, isItalicActive, isUnderlineActive } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      return {
        canUndo: currentEditor?.can().chain().focus().undo().run() ?? false,
        canRedo: currentEditor?.can().chain().focus().redo().run() ?? false,
        isBoldActive: currentEditor?.isActive("bold") ?? false,
        isItalicActive: currentEditor?.isActive("italic") ?? false,
        isUnderlineActive: currentEditor?.isActive("underline") ?? false,
      }
    },
  })
  const sections = [[
  {
      label: "undo",
      Icon: Undo2,
      disabled: !canUndo,
      onClick: () => {
        editor?.chain().focus().undo().run()
      }
    },
    {
      label: "redo",
      Icon : Redo2,
      disabled: !canRedo,
      onClick: () => {
        console.log("redo");
        editor?.chain().focus().redo().run()
      }
    },
    {
      label: "print",
      Icon: Printer,
      onClick: () => {
        console.log("printer");
        window.print();
      }
    },
    {
      label: "spell-check",
      Icon: SpellCheck,
      isActive: spellcheckEnabled,
      onClick: toggleSpellcheck
    },
  ],

   [
    {
      label: "bold",
      Icon: Bold,
      isActive: isBoldActive,
      onClick : () => {
        editor?.chain().focus().toggleBold().run();
      }
    },
    {
      label: "italic",
      Icon: Italic,
      isActive: isItalicActive,
      onClick: () => {
        editor?.chain().focus().toggleItalic().run();
      }
    },
    {
      label: "underline",
      Icon: Underline,
      isActive: isUnderlineActive,
      onClick: () => {
        editor?.chain().focus().toggleUnderline().run();
      }
    },
  ]
    ]
  return <>
    <div className="sticky top-0.5 text-center bg-[#f0f4f9] m-2 rounded-full p-1 flex ">
      {
        sections[0]?.map((item) => {
          return <ToolbarButton key={item.label} {...item} />
        })
      }
      <Separator orientation="vertical" className="h-6 w-0.5 rounded bg-neutral-300" />
      {
        sections[1]?.map((item) => {
          return <ToolbarButton key={item.label} {...item} />
        })
      }
    </div>
  </>
}
export default ToolBar;
