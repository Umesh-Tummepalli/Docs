import { createContext,useContext } from "react";

const EditorContext  = createContext(null)

export const useEditorContext = () => {
  return useContext(EditorContext);
}
export default EditorContext;