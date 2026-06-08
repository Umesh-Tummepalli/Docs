import StarterKit from "@tiptap/starter-kit";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import { TableKit } from "@tiptap/extension-table";
import Image from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";

import {
  ImageResize,
  Figure,
  Figcaption,
} from "tiptap-extension-resize-image";

export const editorConfig = {
  editorProps:{
    attributes: {
    style : "padding-left:56px ;padding-right:56px",
    class : "focus:outline-none print:border-0 bg-white border-[#C7C7C7] flex flex-col min-h-[1123px] w-[794px] shadow-2xl border-[#c4c7c5] border-1 rounded pt-10",
    spellcheck: "true",
    lang: "en-US",
    autocorrect: "on"
  },
},
  extensions: [StarterKit, TaskItem.configure({
    nested:true,
  }), TaskList, TableCell, TableRow, TableHeader, TableKit.configure({
    table:{resizable:true}
  }),
  Image.configure({
    resize: {
      enabled: true,
      directions: ['top', 'bottom', 'left', 'right'], // can be any direction or diagonal combination
      minWidth: 50,
      minHeight: 50,
      alwaysPreserveAspectRatio: true,
    }
  }),
    Underline,
    ImageResize.configure({
    inline:true,
    }),
    Figure,
    Figcaption
  ], // define your extension array
  content: '<h1>Hello World!</h1>', // initial content
}
