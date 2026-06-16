import { useState, useEffect, useRef } from "react";
import { useEditorContext } from "../context/EditorContext";
import { Link2Icon, Check, X, Trash } from "lucide-react";
import ToolbarButton from "./ToolbarButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils.js";

const LinkButton = () => {
  const editor = useEditorContext();
  const [panelOpen, setPanelOpen] = useState(false);
  const [href, setHref] = useState("");
  const [text, setText] = useState("");
  const wrapperRef = useRef(null);

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
    if (editor?.isActive("link")) {
      setHref(editor.getAttributes("link").href || "");
    } else {
      setHref("");
    }
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, " ");
    setText(selectedText || "");
    setPanelOpen(true);
  };

  const applyLink = () => {
    if (!editor) return;

    if (href) {
      const { from, to } = editor.state.selection;
      const currentSelectedText = editor.state.doc.textBetween(from, to, " ");

      // If text changed, replace the selection with the new text.
      if (text && text !== currentSelectedText) {
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .insertContent({
            type: "text",
            text: text,
            marks: [
              {
                type: "link",
                attrs: { href: href, target: "_blank", class: "text-blue-500 underline" },
              },
            ],
          })
          .run();
      } else {
        // If text hasn't changed, just apply the link mark to preserve existing formatting
        editor
          .chain()
          .focus()
          .extendMarkRange("link")
          .setLink({ href: href, target: "_blank", class: "text-blue-500 underline" })
          .run();
      }
    } else {
      editor.chain().focus().unsetLink().run();
    }

    setPanelOpen(false);
  };

  const removeLink = () => {
    if (!editor) return;
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setPanelOpen(false);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <ToolbarButton
        Icon={Link2Icon}
        label="Link"
        isActive={editor?.isActive("link")}
        onClick={() => {
          if (panelOpen) {
            setPanelOpen(false);
          } else {
            onOpenPanel();
          }
        }}
      />

      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 rounded-lg bg-white p-3 shadow-lg border border-gray-200">
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
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-gray-700">Text</label>
                <Input
                  className="h-8 text-sm"
                  placeholder="Link Text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <div className="flex justify-between gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={removeLink}
                  disabled={!editor?.isActive("link")}
                >
                  <Trash className="h-4 w-4 mr-1" /> Remove
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setPanelOpen(false)}>
                    <X className="h-4 w-4 mr-1" /> Cancel
                  </Button>
                  <Button size="sm" className="h-8" onClick={applyLink}>
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
