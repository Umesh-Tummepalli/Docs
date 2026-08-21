import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { TableKit } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TextAlign from "@tiptap/extension-text-align";
import {
  Color,
  FontFamily,
  FontSize,
  TextStyle,
} from "@tiptap/extension-text-style";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import { TextSelection } from "@tiptap/pm/state";
import StarterKit from "@tiptap/starter-kit";
import { CustomBulletList } from "./extensions/customBulletList";
import { CustomOrderedList } from "./extensions/customOrderedList";
import { LineHeight } from "./extensions/lineHeight";
import { CustomImage } from "./extensions/customImage";
import Collaboration from '@tiptap/extension-collaboration'
import { getClipboardImageFile } from "./extensions/imageUpload";


const editorAttributes = {
  class: "focus:outline-none print:border-0",
  spellcheck: "true",
  lang: "en-US",
  autocorrect: "on",
};

const editorExtensions = [
  StarterKit.configure({
    bulletList: false,
    orderedList: false,
  }),
  CustomBulletList,
  CustomOrderedList,
  TaskItem.configure({
    nested: true,
  }),
  TaskList,
  TableCell,
  TableRow,
  TableHeader,
  TableKit.configure({
    table: { resizable: true },
  }),
  // Single unified image node — handles assetId, uploadId, and direct src
  CustomImage,
  Underline,
  FontFamily,
  TextStyle,
  FontSize,
  Heading.configure({
    levels: [1, 2, 3, 4, 5],
  }),
  Highlight.configure({
    multicolor: true,
  }),
  Color.configure({
    types: ["textStyle"],
  }),
  Link.configure({
    openOnClick: false,
    autoLink: true,
    defaultProtocol: "https",
  }),
  TextAlign.configure({
    types: ["heading", "paragraph"],
    alignments: ["left", "center", "right", "justify"],
    defaultAlignment: "left",
  }),
  LineHeight.configure({
    types: ['paragraph', 'heading'],
    defaultLineHeight: '1.5',
  }),
];

export const editorConfig = (yDoc, editable = true, onImagePaste) => {
  return {
    editable,
    editorProps: {
      attributes: editorAttributes,
      handleClick: (view, pos, event) => {
        const target = event.target;
        const element = target?.nodeType === 3 ? target.parentNode : target;
  
        if (element?.closest && element.closest("a")) {
          event.preventDefault();
  
          const { tr } = view.state;
          const selection = TextSelection.create(view.state.doc, pos);
          view.dispatch(tr.setSelection(selection));
  
          return true;
        }
  
        return false;
      },
      handlePaste: (view, event) => {
        const imageFile = getClipboardImageFile(event.clipboardData);
        if (!imageFile) return false;

        event.preventDefault();
        onImagePaste?.(imageFile);
        return true;
      },
    },
    extensions: [
      ...editorExtensions,
      Collaboration.configure({
        document: yDoc,
        feild : 'prosemirror'
      }),
    ],
    onUpdate: ({ editor }) => {
        const html = editor.getJSON();
        // Call your onChange function here
        console.log(html);
      },
    // Do NOT set content here — Collaboration extension loads it from the Y.Doc
  };
}
