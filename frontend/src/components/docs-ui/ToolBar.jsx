import { useState } from "react"
import {cn} from "../../lib/utils"
import { Bold, Italic, Printer, Redo2, SpellCheck, Underline, Undo2 } from "lucide-react"
import { useEditorContext } from "./context/EditorContext"
import { useEditorState } from "@tiptap/react"
const ToolbarButton = ({ Icon, onClick = null, isActive = null, label, disabled = false }) => {

  return <>
    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      title={label}
      disabled={disabled}
      className={cn(
        "  h-7 min-w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] p-1 mx-1 ",
        isActive && "bg-[#d3e3fd]",
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

  const { canUndo, canRedo } = useEditorState({
    editor,
    selector: ctx => {
      return {
        canUndo: ctx.editor?.can().chain().focus().undo().run(),
        canRedo: ctx.editor?.can().chain().focus().redo().run(),
      }
    },
  })
  const sections = [
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
    {
      label: "Bold",
      Icon: Bold,
      onClick : () => {
        console.log("This is bold functionality");
      }
    },
    {
      label: "italic",
      Icon: Italic,
      onClick: () => {
        console.log("italic");
      }
    },
    {
      label: "underline",
      Icon: Underline,
      onClick: () => {
        console.log("underline");
      }
    },
  ]
  return <>
    <div className="sticky top-0.5 text-center bg-[#f0f4f9] m-2 rounded-full p-1 flex ">
      {
        sections.map((item) => {
          return <ToolbarButton key={item.label} onClick={item.onClick} Icon={item.Icon} label={item.label} isActive={item.isActive} disabled={item.disabled} />
        })
      }
    </div>
  </>
}
export default ToolBar;
