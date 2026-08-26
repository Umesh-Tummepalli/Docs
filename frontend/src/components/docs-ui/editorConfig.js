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
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
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
    // StarterKit includes its own history; Collaboration replaces it.
    history: false,
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
    types: ["paragraph", "heading"],
    defaultLineHeight: "1.5",
  }),
];

/**
 * Build TipTap editor configuration.
 *
 * @param {Y.Doc}                yDoc         - The existing shared Y.Doc.
 * @param {SocketIOYProvider}    provider     - The existing collaboration provider (must have .awareness).
 * @param {boolean}              editable     - Whether the editor is in edit mode.
 * @param {Function|undefined}   onImagePaste - Callback for paste-to-upload.
 */
export const editorConfig = (yDoc, provider, editable = true, onImagePaste) => {
  // Build the collaboration extensions list.
  // CollaborationCaret is only added when a live provider is available so the
  // editor never receives an undefined provider object.
  const collaborationExtensions = [
    Collaboration.configure({
      // The existing Y.Doc continues to drive document state — unchanged.
      document: yDoc,
      field: "prosemirror",
    }),
  ];

  if (provider) {
    collaborationExtensions.push(
      CollaborationCaret.configure({
        // provider.awareness is the Awareness instance created by SocketIOYProvider.
        // CollaborationCaret reads remote users' cursor data from it.
        provider,
        // The local user's display information is already set on the Awareness
        // state by YDocContext via provider.setUser(). CollaborationCaret will
        // also read/write the local state field here — this keeps it consistent.
        user: provider.awareness.getLocalState()?.user ?? {
          name: "Anonymous",
          color: "#888888",
        },
      })
    );
  }

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
      ...collaborationExtensions,
    ],
    onUpdate: ({ editor }) => {
      const json = editor.getJSON();
      // Call your onChange function here
      console.log(json);
    },
    // Do NOT set content here — Collaboration extension loads it from the Y.Doc.
  };
};
