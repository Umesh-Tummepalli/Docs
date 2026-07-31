import { useParams } from "react-router-dom";
import Editor from "./Editior"; 
import ToolBar from "./ToolBar";
import Ruler from "./Ruler";
import EditorContext from "./context/EditorContext";
import { useEditor } from "@tiptap/react";
import { editorConfig } from "./editorConfig";
export default function Document() {
  const { docId } = useParams();
  const editor = useEditor(editorConfig)
  return (
    <div className="bg-[#f9fbfd]">
      <h1>Document {docId}</h1>
      <div className="min-h-screen">
        <EditorContext.Provider value={editor}>
          <div className="sticky top-[73px] z-40 bg-[#f9fbfd] pt-2 print:hidden">
            <ToolBar/>
            <Ruler/>
          </div>
          <Editor/>
        </EditorContext.Provider>
      </div>
    </div>
  );
}
