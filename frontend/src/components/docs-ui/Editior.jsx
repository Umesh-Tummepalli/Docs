// src/Tiptap.tsx
import { EditorContent } from '@tiptap/react'
import { useEditorContext } from './context/EditorContext';
const Editor = () => {
  
  const  editor  = useEditorContext(); 

  return (
    <>
      <div className="size-full bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-hidden">
        <div className="flex justify-center w-204 py-4 print:py-0  mx-auto my-4">
          <EditorContent editor={editor} />
        </div>
      </div>
    </>
  )
}

export default Editor;
