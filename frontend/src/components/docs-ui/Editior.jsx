// src/Tiptap.tsx
import { EditorContent } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { useEditorContext } from './context/EditorContext';
import LinkButton from './toolbar/LinkButton';
import LinkTooltip from './toolbar/LinkTooltip';
import Ruler from './Ruler';

const Editor = () => {
  const editor = useEditorContext(); 

  return (
    <>
      <div className="size-full bg-[#F9FBFD] px-4 print:p-0 print:bg-white print:overflow-hidden relative">
        <Ruler/>
        <div className="flex justify-center w-204 py-4 print:py-0 mx-auto my-4 relative">
          {/* {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
              <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1 shadow-md">
                <LinkButton />
              </div>
            </BubbleMenu>
          )}
          <LinkTooltip />*/}
          <EditorContent editor={editor} id="document"/>
        </div>
      </div>
    </>
  )
}

export default Editor;
