import { useEffect, useRef, useState } from "react";

import { useEditorState } from "@tiptap/react";
import { ChevronDownIcon, Highlighter, Check } from "lucide-react";
import { SketchPicker } from "react-color";

import { cn } from "@/lib/utils.js";
import { useEditorContext } from "../context/EditorContext";

const PRESET_COLORS = [
  "#ffffff", // None/White
  "#fbbc04", // Yellow
  "#f28b82", // Red
  "#ccff90", // Green
  "#a7ffeb", // Cyan
  "#aecbfa", // Blue
  "#d7aefb", // Purple
];

const HighlightButton = () => {
  const editor = useEditorContext();
  const [panelOpen, setPanelOpen] = useState(false);
  const [color, setColor] = useState("#fbbc04"); 
  const wrapperRef = useRef(null);

  const { isHighlighted, highlightColor } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      highlightColor: currentEditor.getAttributes("highlight").color,
      isHighlighted: currentEditor.isActive("highlight"),
    }),
  });

  const pickerColor = highlightColor || color;

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

  const applyHighlight = (selectedColor) => {
    editor?.chain().focus().setHighlight({ color: selectedColor }).run();
  };

  const toggleHighlight = () => {
    if (!editor) return;

    if (isHighlighted) {
      editor.chain().focus().unsetHighlight().run();
      return;
    }

    applyHighlight(pickerColor);
  };

  return (
    <div ref={wrapperRef} className="relative inline-flex items-center">
      <div 
        className={cn(
          "flex items-center rounded-md h-7 mx-1 transition-colors",
          (panelOpen || isHighlighted) ? "bg-[#d3e3fd] text-[#0b57d0]" : "hover:bg-[#e2e7eb] text-gray-700"
        )}
      >
        <button
          className="flex h-full flex-col items-center justify-center rounded-l-md px-1.5 pt-0.5 text-inherit transition-colors hover:bg-black/5 cursor-pointer"
          onClick={toggleHighlight}
          title="Highlight color"
        >
          <Highlighter size={16} strokeWidth={2} className="shrink-0" />
          <div
            className="mt-0.5 h-[3px] w-3.5 rounded-sm shrink-0"
            style={{
              backgroundColor: pickerColor === "#ffffff" ? "transparent" : pickerColor,
              border: pickerColor === "#ffffff" ? "1px solid currentColor" : "none"
            }}
          />
        </button>

        <button
          className="flex h-full items-center justify-center rounded-r-md px-1 text-inherit transition-colors hover:bg-black/5 cursor-pointer"
          onClick={() => setPanelOpen((prev) => !prev)}
          title="Highlight color options"
        >
          <ChevronDownIcon size={14} strokeWidth={2.5} className="shrink-0" />
        </button>
      </div>

      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-[220px] rounded-md border border-gray-200 bg-white p-3 shadow-lg">
          <div className="mb-3">
            <div className="flex flex-wrap gap-1.5">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  className={cn(
                    "relative flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 transition-transform hover:scale-110",
                    pickerColor === preset && "ring-2 ring-blue-400 ring-offset-1"
                  )}
                  style={{
                    backgroundColor: preset,
                  }}
                  onClick={() => {
                    setColor(preset);
                    if (preset === "#ffffff") {
                      editor?.chain().focus().unsetHighlight().run();
                    } else {
                      applyHighlight(preset);
                    }
                    setPanelOpen(false);
                  }}
                  title={preset === "#ffffff" ? "None" : preset}
                >
                  {pickerColor === preset && preset !== "#ffffff" && (
                    <Check size={12} className="text-black/60" strokeWidth={3} />
                  )}
                  {preset === "#ffffff" && (
                    <div className="h-0.5 w-6 rotate-45 bg-red-500 absolute" /> 
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="mb-2 text-xs font-medium text-gray-500">Custom</p>
            <div className="[&_.sketch-picker]:!box-border [&_.sketch-picker]:!w-full [&_.sketch-picker]:!rounded-md [&_.sketch-picker]:!border-0 [&_.sketch-picker]:!shadow-none">
              <SketchPicker
                color={pickerColor}
                onChangeComplete={(c) => {
                  setColor(c.hex);
                  applyHighlight(c.hex);
                }}
                presetColors={[]} 
                disableAlpha
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HighlightButton;