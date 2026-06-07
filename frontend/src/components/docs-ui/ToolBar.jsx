import {cn} from "../../lib/utils"
import { Bold, Italic, Printer, Redo2, Underline, Undo2 } from "lucide-react"
import { useEditorContext } from "./context/EditorContext"
import { useEditorState } from "@tiptap/react"
const ToolbarButton = ({ Icon, onClick = null, isActive = null }) => {
  return <>
    <button onClick={onClick}
      className={cn(
        "  h-7 min-w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] p-1 mx-1 ",
        isActive && "bg-[#d3e3fd]"
      )}
    >
      <Icon size={16}/>
    </button>
  </>
}

const ToolBar = () => {
  const editor = useEditorContext();
  const { canUndo, canRedo } = useEditorState({
    editor,
    selector: ctx => {
      return {
        canUndo: ctx.editor.can().chain().focus().undo().run(),
        canRedo: ctx.editor.can().chain().focus().redo().run(),
      }
    },
  })
  const sections = [
  {
      label: "undo",
      Icon: Undo2,
      onClick: () => {
        editor.chain().focus().undo().run()
      }
    },
    {
      label: "redo",
      Icon : Redo2,
      onClick: () => {
        console.log("redo");

      }
    },
    {
      label: "print",
      Icon: Printer,
      onClick: () => {
        console.log("printer");
      }
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
    <div className="sticky top-0 text-center bg-[#f0f4f9] m-2 rounded-full p-1 flex ">
      {
        sections.map((item) => {
          return <ToolbarButton key={item.label} onClick={item.onClick} Icon={item.Icon} />
        })
        }
    </div>
  </>
}
export default ToolBar;
