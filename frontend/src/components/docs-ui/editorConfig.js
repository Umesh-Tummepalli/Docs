import { TextSelection } from '@tiptap/pm/state';
import Heading from "@tiptap/extension-heading";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import { TableKit } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import { Color, FontFamily, TextStyle,FontSize } from "@tiptap/extension-text-style";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import BulletList from '@tiptap/extension-bullet-list';
import OrderedList from '@tiptap/extension-ordered-list';
import {
  Figcaption,
  Figure,
  ImageResize,
} from "tiptap-extension-resize-image";

const CustomBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: 'disc',
        parseHTML: element => element.style.listStyleType || 'disc',
        renderHTML: attributes => {
          if (!attributes.listStyleType || attributes.listStyleType === 'disc') {
            return {};
          }
          return {
            style: `list-style-type: ${attributes.listStyleType}`,
          };
        },
      },
    };
  },
});

const CustomOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listStyleType: {
        default: 'decimal',
        parseHTML: element => element.style.listStyleType || 'decimal',
        renderHTML: attributes => {
          if (!attributes.listStyleType || attributes.listStyleType === 'decimal') {
            return {};
          }
          return {
            style: `list-style-type: ${attributes.listStyleType}`,
          };
        },
      },
    };
  },
});

const editorAttributes = {
  style: "padding-left: 56px; padding-right: 56px",
  class:
    "focus:outline-none print:border-0 bg-white flex flex-col min-h-[1123px] w-[794px] shadow-2xl border border-[#c4c7c5] rounded pt-10",
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
    defaultProtocol:"https"
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    alignments:['left', 'center', 'right', 'justify'],
    defaultAlignment: 'left',
  })
];

export const editorConfig = {
  editorProps: {
    attributes: editorAttributes,
    handleClick: (view, pos, event) => {
      const target = event.target;
      const element = target?.nodeType === 3 ? target.parentNode : target;
      if (element?.closest && element.closest('a')) {
        event.preventDefault();
        
        // Manually set selection so the cursor moves to the clicked link
        const { tr } = view.state;
        const selection = TextSelection.create(view.state.doc, pos);
        view.dispatch(tr.setSelection(selection));
        
        return true; // Stop all further event handling (including redirects)
      }
      return false;
    }
  },
  extensions: editorExtensions,
  content: "<h1>Hello World!</h1>",
};
