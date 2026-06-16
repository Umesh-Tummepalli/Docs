import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { TableKit } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import { Color, FontFamily, TextStyle } from "@tiptap/extension-text-style";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import Link from '@tiptap/extension-link'

import {
  Figcaption,
  Figure,
  ImageResize,
} from "tiptap-extension-resize-image";

const editorAttributes = {
  style: "padding-left: 56px; padding-right: 56px",
  class:
    "focus:outline-none print:border-0 bg-white flex flex-col min-h-[1123px] w-[794px] shadow-2xl border border-[#c4c7c5] rounded pt-10",
  spellcheck: "true",
  lang: "en-US",
  autocorrect: "on",
};

const editorExtensions = [
  StarterKit,
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
  Image.configure({
    resize: {
      enabled: true,
      directions: ["top", "bottom", "left", "right"],
      minWidth: 50,
      minHeight: 50,
      alwaysPreserveAspectRatio: true,
    },
  }),
  Underline,
  ImageResize.configure({
    inline: true,
  }),
  Figure,
  Figcaption,
  FontFamily,
  TextStyle,
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
    defaultProtocol:"https"
  })
];

export const editorConfig = {
  editorProps: {
    attributes: editorAttributes,
  },
  extensions: editorExtensions,
  content: "<h1>Hello World!</h1>",
};
