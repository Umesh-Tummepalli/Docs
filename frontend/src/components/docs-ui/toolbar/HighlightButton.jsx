import { useEffect, useRef, useState } from "react";

import { useEditorState } from "@tiptap/react";
import { ChevronDownIcon, Highlighter } from "lucide-react";
import { SketchPicker } from "react-color";

import { cn } from "@/lib/utils.js";
import { useEditorContext } from "../context/EditorContext";

const PRESET_COLORS = [
  "#faf594",
  "#f28b82",
  "#fbbc04",
  "#ccff90",
  "#a7ffeb",
  "#aecbfa",
  "#d7aefb",
];

const HighlightButton = () => {
  const editor = useEditorContext();
  const [panelOpen, setPanelOpen] = useState(false);
  const [color, setColor] = useState("#faf594");
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

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <button
        className={cn(
          "flex h-8 items-center justify-center rounded-l-md px-2 hover:bg-[#e2e7eb]",
          isHighlighted && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
        )}
        onClick={() => applyHighlight(pickerColor)}
      >
        <div className="relative flex items-center justify-center">
          <Highlighter size={16} />
          <div
            className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
            style={{
              backgroundColor: pickerColor,
            }}
          />
        </div>
      </button>

      <button
        className={cn(
          "h-8 rounded-r-md px-1 hover:bg-[#e2e7eb]",
          isHighlighted && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
        )}
        onClick={() => setPanelOpen((prev) => !prev)}
      >
        <ChevronDownIcon size={14} />
      </button>

      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 rounded-lg  bg-white p-3 shadow-lg">
          <div className="mb-3">
            <p className="mb-2 text-xs text-gray-500">Presets</p>

            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  className="h-6 w-6 rounded-full shadow-2xs transition-transform hover:scale-110"
                  style={{
                    backgroundColor: preset,
                  }}
                  onClick={() => {
                    setColor(preset);
                    applyHighlight(preset);
                  }}
                />
              ))}
            </div>
          </div>

          <SketchPicker
            color={pickerColor}
            onChangeComplete={(c) => {
              setColor(c.hex);
              applyHighlight(c.hex);
            }}
          />

          <button
            className="mt-3 w-full rounded-md border px-3 py-2 text-sm hover:bg-gray-100"
            onClick={() => {
              editor?.chain().focus().unsetHighlight().run();
              setPanelOpen(false);
            }}
          >
            Remove Highlight
          </button>
        </div>
      )}
    </div>
  );
};

export default HighlightButton;
