import { useState, useEffect, useRef } from "react";
import { useEditorState } from "@tiptap/react";
import { useEditorContext } from "../context/EditorContext";
import { Link2Icon, Check, X, Trash } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMarkRange } from "@tiptap/core";

const LinkButton = () => {
  const editor = useEditorContext();
  const [panelOpen, setPanelOpen] = useState(false);
  const [href, setHref] = useState("");
  const [text, setText] = useState("");
  const [selectionRange, setSelectionRange] = useState(null);
  const wrapperRef = useRef(null);

  const { isLinkActive } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isLinkActive: currentEditor.isActive("link"),
    }),
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const onOpenPanel = () => {
    if (!editor) return;

    let currentFrom = editor.state.selection.from;
    let currentTo = editor.state.selection.to;

    if (editor.isActive("link")) {
      setHref(editor.getAttributes("link").href || "");
      
      const linkRange = getMarkRange(
        editor.state.selection.$from,
        editor.schema.marks.link
      );
      
      if (linkRange) {
        currentFrom = linkRange.from;
        currentTo = linkRange.to;
      }
    } else {
      setHref("");
    }

    setSelectionRange({ from: currentFrom, to: currentTo });
    
    const selectedText = editor.state.doc.textBetween(currentFrom, currentTo, " ");
    setText(selectedText || "");
    setPanelOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;

    if (href) {
      let finalHref = href.trim();
      if (
        finalHref &&
        !/^https?:\/\//i.test(finalHref) &&
        !finalHref.startsWith("mailto:") &&
        !finalHref.startsWith("tel:") &&
        !finalHref.startsWith("/") &&
        !finalHref.startsWith("#")
      ) {
        finalHref = `https://${finalHref}`;
      }

      let currentChain = editor.chain().focus();
      
      if (selectionRange) {
        currentChain = currentChain.setTextSelection(selectionRange);
      }

      const { from, to } = selectionRange || editor.state.selection;
      const currentSelectedText = editor.state.doc.textBetween(from, to, " ");

      if (text && text !== currentSelectedText) {
        currentChain
          .extendMarkRange("link")
          .insertContent({
            type: "text",
            text: text,
            marks: [
              {
                type: "link",
                attrs: { href: finalHref, target: "_blank", class: "text-blue-500 underline" },
              },
            ],
          })
          .run();
      } else {
        currentChain
          .extendMarkRange("link")
          .setLink({ href: finalHref, target: "_blank", class: "text-blue-500 underline" })
          .run();
      }
    } else {
      let currentChain = editor.chain().focus();
      if (selectionRange) {
        currentChain = currentChain.setTextSelection(selectionRange);
      }
      currentChain.extendMarkRange("link").unsetLink().run();
    }

    setPanelOpen(false);
    setSelectionRange(null);
  };

  const removeLink = () => {
    if (!editor) return;
    let currentChain = editor.chain().focus();
    if (selectionRange) {
      currentChain = currentChain.setTextSelection(selectionRange);
    }
    currentChain.extendMarkRange("link").unsetLink().run();
    setPanelOpen(false);
    setSelectionRange(null);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <ToolbarButton
        Icon={Link2Icon}
        label="Link"
        isActive={isLinkActive}
        onClick={(e) => {
          e.preventDefault();
          if (panelOpen) {
            setPanelOpen(false);
            setSelectionRange(null);
          } else {
            onOpenPanel();
          }
        }}
      />

      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg bg-[#f9fbfd] p-3 shadow-lg border border-gray-200">
          <div className="grid gap-4">
            <div className="space-y-1">
              <h4 className="font-medium leading-none text-sm">Link Details</h4>
              <p className="text-xs text-muted-foreground">Set the URL and display text for the link.</p>
            </div>
            <div className="grid gap-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">URL</label>
                <Input
                  className="h-8 text-sm"
                  placeholder="https://example.com"
                  value={href}
                  onChange={(e) => setHref(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Text</label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Link Text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      applyLink();
                    }
                  }}
                />
              </div>
              <div className="flex justify-between gap-2 mt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={removeLink}
                  disabled={!editor?.isActive("link")}
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="" 
                    size="sm" 
                    className="h-8 hover:bg-[#e2e7eb]" 
                    onClick={() => { setPanelOpen(false); setSelectionRange(null); }}
                  >
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    className="h-8 hover:bg-[#e2e7eb]" 
                    onClick={applyLink}
                  >
                    <Check className="h-4 w-4 mr-1" /> Apply
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LinkButton;