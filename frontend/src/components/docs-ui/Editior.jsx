// src/Tiptap.tsx
import { EditorContent } from '@tiptap/react'
import { useEditorContext } from './context/EditorContext';
import LinkTooltip from './toolbar/LinkTooltip';

const Editor = () => {
  const editor = useEditorContext();

  return (
    <>
      <div className="w-full bg-[#F9FBFD] px-4 pb-32 print:p-0 print:bg-white relative">
        <div className="flex justify-center py-4 print:py-0 mx-auto my-4 relative min-w-fit">
          {/* {editor && (
            <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
              <div className="flex items-center gap-1 rounded-md border border-neutral-200 bg-white p-1 shadow-md">
                <LinkButton />
              </div>
            </BubbleMenu>
          )} */}
          <LinkTooltip />
          <div className="document-page print:shadow-none">
            <EditorContent editor={editor} id="document" />
          </div>
        </div>
      </div>
    </>
  )
}

export default Editor;
