import { useEffect, useRef, useState } from "react";

import { useEditorState } from "@tiptap/react";
import { ChevronDown, ChevronUp, Palette } from "lucide-react";
import { SketchPicker } from "react-color";

import { Button } from "../../ui/button";
import { cn } from "@/lib/utils.js";
import { useEditorContext } from "../context/EditorContext";

const PRESET_COLORS = [
  "#000000",
  "#434343",
  "#666666",
  "#999999",
  "#b7b7b7",
  "#cccccc",
  "#d9d9d9",
  "#efefef",
  "#f3f3f3",
  "#ffffff",
  "#980000",
  "#ff0000",
  "#ff9900",
  "#ffff00",
  "#00ff00",
  "#00ffff",
  "#4a86e8",
  "#0000ff",
  "#9900ff",
  "#ff00ff",
];

const TextColorButton = () => {
  const editor = useEditorContext();
  const [panelOpen, setPanelOpen] = useState(false);
  const [color, setColor] = useState("#000000");
  const [showCustomPicker, setShowCustomPicker] = useState(false);
  const wrapperRef = useRef(null);

  const { isTextColored, textColor } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      const currentColor = currentEditor.getAttributes("textStyle").color;
      return {
        textColor: currentColor,
        isTextColored: currentEditor.isActive("textStyle"),
      };
    },
  });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPanelOpen(false);
        setShowCustomPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const applyTextColor = (selectedColor) => {
    editor?.chain().focus().setColor(selectedColor).run();
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "flex h-8 items-center justify-center rounded-l-md px-2 hover:bg-accent",
          isTextColored && "bg-[#d3e3fd] text-[#0b57d0]  hover:bg-[#d3e3fd]"
        )}
        onClick={() => applyTextColor(color)}
      >
        <div className="relative flex items-center justify-center">
          <span className="text-sm font-medium">A</span>
          <div
            className="absolute -bottom-1 left-0 right-0 h-[3px] rounded-full"
            style={{
              backgroundColor: textColor || "#000",
            }}
          />
        </div>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 rounded-r-md px-1 hover:bg-accent",
          isTextColored && "bg-[#d3e3fd] text-[#0b57d0] hover:bg-[#d3e3fd]"
        )}
        onClick={() => {
          setPanelOpen((prev) => !prev);
          setShowCustomPicker(false);
        }}
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {panelOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg  bg-popover p-3 shadow-lg">
          <div className="mb-3">
            <p className="mb-2 text-xs text-muted-foreground">Presets</p>

            <div className="grid grid-cols-10 gap-1">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  className={cn(
                    "h-6 w-6 rounded-full transition-transform hover:scale-110 shadow",
                    color === preset && "ring-2 ring-offset-1 ring-primary "
                  )}
                  style={{
                    backgroundColor: preset,
                  }}
                  onClick={() => {
                    setColor(preset);
                    applyTextColor(preset);
                    setShowCustomPicker(false);
                  }}
                />
              ))}
            </div>
          </div>

          <Button
            variant=""
            className="mb-3 w-full justify-between text-sm shadow hover:bg-[#e2e7eb]"
            onClick={() => setShowCustomPicker(!showCustomPicker)}
          >
            <span className="flex items-center gap-2">
              <Palette className="h-4 w-4" />
              Custom Color
            </span>
            {showCustomPicker ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          <div
            className={cn(
              "mb-3 transition-all duration-200 overflow-hidden ",
              showCustomPicker ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
            )}
          >
            <SketchPicker
              color={color}
              onChangeComplete={(c) => {
                setColor(c.hex);
                applyTextColor(c.hex);
              }}
            />
          </div>

          <Button
            variant=""
            className="w-full text-sm shadow "
            onClick={() => {
              editor?.chain().focus().unsetColor().run();
              setColor("#000000");
              setShowCustomPicker(false);
              setPanelOpen(false);
            }}
          >
            Remove Color
          </Button>
        </div>
      )}
    </div>
  );
};

export default TextColorButton;
