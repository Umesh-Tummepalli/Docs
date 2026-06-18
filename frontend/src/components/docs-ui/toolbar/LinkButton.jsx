import { useState, useEffect, useRef, useCallback } from "react";
import { useEditorState } from "@tiptap/react";
import { useEditorContext } from "../context/EditorContext";
import { 
  Link2Icon, 
  Check, 
  X, 
  Trash, 
  ExternalLink, 
  AlertCircle,
  Pencil,
  Globe,
  LinkIcon,
  Type
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  const [error, setError] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState("url");
  const wrapperRef = useRef(null);
  const hrefInputRef = useRef(null);

  const { isLinkActive, linkAttrs } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isLinkActive: currentEditor?.isActive("link"),
      linkAttrs: currentEditor?.isActive("link") 
        ? currentEditor.getAttributes("link") 
        : null,
    }),
  });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        closePanel();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus href input when panel opens
  useEffect(() => {
    if (panelOpen && hrefInputRef.current) {
      setTimeout(() => hrefInputRef.current?.focus(), 100);
    }
  }, [panelOpen]);

  // Track changes for unsaved changes warning
  useEffect(() => {
    if (panelOpen) {
      setHasChanges(true);
    }
  }, [href, text]);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setSelectionRange(null);
    setError("");
    setHasChanges(false);
  }, []);

  const onOpenPanel = useCallback(() => {
    if (!editor) return;

    let currentFrom = editor.state.selection.from;
    let currentTo = editor.state.selection.to;

    if (editor.isActive("link")) {
      const currentHref = editor.getAttributes("link").href || "";
      setHref(currentHref);
      
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
    setError("");
    setHasChanges(false);
  }, [editor]);

  const validateUrl = (url) => {
    if (!url.trim()) return false;
    if (
      url.startsWith("mailto:") ||
      url.startsWith("tel:") ||
      url.startsWith("/") ||
      url.startsWith("#")
    ) {
      return true;
    }
    
    try {
      const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  };

  const formatUrl = (url) => {
    let finalHref = url.trim();
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
    return finalHref;
  };

  const applyLink = () => {
    if (!editor) return;

    const trimmedHref = href.trim();
    
    if (!trimmedHref) {
      setError("Please enter a URL");
      return;
    }

    if (!validateUrl(trimmedHref)) {
      setError("Please enter a valid URL");
      return;
    }

    setError("");
    const finalHref = formatUrl(trimmedHref);

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
              attrs: { 
                href: finalHref, 
                target: "_blank", 
                class: "text-blue-500 underline hover:text-blue-600 cursor-pointer" 
              },
            },
          ],
        })
        .run();
    } else {
      currentChain
        .extendMarkRange("link")
        .setLink({ 
          href: finalHref, 
          target: "_blank", 
          class: "text-blue-500 underline hover:text-blue-600 cursor-pointer" 
        })
        .run();
    }

    closePanel();
  };

  const removeLink = () => {
    if (!editor) return;
    let currentChain = editor.chain().focus();
    if (selectionRange) {
      currentChain = currentChain.setTextSelection(selectionRange);
    }
    currentChain.extendMarkRange("link").unsetLink().run();
    closePanel();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      applyLink();
    }
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
            closePanel();
          } else {
            onOpenPanel();
          }
        }}
      />

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-2 w-[380px] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
          >

            {/* Content */}
            <div className="p-5 space-y-4">
              {/* URL Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <Globe className="h-3.5 w-3.5" />
                  URL
                  <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <Input
                    ref={hrefInputRef}
                    className={`pl-10 pr-10 h-10 text-sm rounded-lg ${
                      error
                        ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                        : "border-gray-300 focus:ring-blue-500/20 focus:border-blue-500"
                    }`}
                    placeholder="https://example.com or /page"
                    value={href}
                    onChange={(e) => {
                      setHref(e.target.value);
                      setError("");
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                    aria-invalid={!!error}
                    aria-describedby={error ? "url-error" : undefined}
                  />
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  
                  {href && !error && (
                    <button
                      onClick={() => setHref("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
                    >
                      <X className="h-3.5 w-3.5 text-gray-400" />
                    </button>
                  )}
                </div>

                {error ? (
                  <motion.p
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs text-red-500"
                    id="url-error"
                  >
                    <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    {error}
                  </motion.p>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-gray-400">
                    <ExternalLink className="h-3 w-3" />
                    <span>Supports http://, https://, mailto:, tel:, or relative paths</span>
                  </div>
                )}
              </div>

              {/* Text Input */}
              <div className="space-y-2">
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                  <Type className="h-3.5 w-3.5" />
                  Display Text
                </label>
                <div className="relative">
                  <Input
                    className="pl-10 h-10 text-sm rounded-lg border-gray-300 focus:ring-blue-500/20 focus:border-blue-500"
                    placeholder="Link display text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        applyLink();
                      }
                    }}
                  />
                  <Pencil className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                </div>
                <p className="text-xs text-gray-400">
                  Custom text to display for this link
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={removeLink}
                  disabled={!isLinkActive}
                >
                  <Trash className="h-4 w-4 mr-1.5" />
                  Remove Link
                </Button>

                <div className="flex gap-2">
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="sm" 
                    className="h-9 px-4 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors" 
                    onClick={closePanel}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="button"
                    size="sm" 
                    className="h-9 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={applyLink}
                    disabled={!href.trim()}
                  >
                    <Check className="h-4 w-4 mr-1.5" />
                    {isLinkActive ? "Update" : "Apply"}
                  </Button>
                </div>
              </div>

              {/* Keyboard Shortcut Hint */}
              <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
                <span>Press</span>
                <kbd className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-600">
                  Enter
                </kbd>
                <span>to apply</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LinkButton;