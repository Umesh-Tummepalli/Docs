import { createContext,useContext } from "react";

const EditorContext  = createContext(null)

export const useEditorContext = () => {
  const context = useContext(EditorContext);
  if(!context) {
    throw new Error('useEditorContext must be used within an EditorContextProvider');
  }
  return context;
}
export default EditorContext;