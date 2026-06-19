import { useEffect, useRef, useState } from "react";
import { useEditorState } from "@tiptap/react";
import { Minus, Plus } from "lucide-react";
import { useEditorContext } from "../context/EditorContext";
import { cn } from "@/lib/utils.js";

const PRESET_FONT_SIZES = [
  "9px",
  "10px",
  "11px",
  "12px",
  "13px",
  "14px",
  "15px",
  "16px",
  "18px",
  "24px",
  "30px",
  "36px",
  "48px",
  "60px",
  "72px",
  "96px"
];

const FontSizeButton = () => {
  const editor = useEditorContext();
  const [inputValue, setInputValue] = useState("16");
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  const { currentFontSize } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => {
      if (!currentEditor) return { currentFontSize: "16px" };
      return {
        currentFontSize: currentEditor.getAttributes("textStyle").fontSize || "16px",
      };
    },
  });

  // Sync input value with current editor font size when not focused
  useEffect(() => {
    if (!isFocused && currentFontSize) {
      const match = currentFontSize.match(/^(\d+)/);
      if (match) {
        setInputValue(match[1]);
      } else {
        setInputValue("16");
      }
    }
  }, [currentFontSize, isFocused]);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const updateFontSize = (newSize) => {
    if (!editor) return;
    const size = Math.max(1, parseInt(newSize, 10));
    if (!isNaN(size)) {
      editor.chain().focus().setFontSize(`${size}px`).run();
      setInputValue(String(size));
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      updateFontSize(inputValue);
      setDropdownOpen(false);
      e.target.blur();
    } else if (e.key === "Escape") {
      setDropdownOpen(false);
      e.target.blur();
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setDropdownOpen(true);
  };

  const handleInputBlur = () => {
    setIsFocused(false);
    updateFontSize(inputValue);
  };

  const handleDecrease = () => {
    const current = parseInt(inputValue, 10) || 16;
    if (current > 1) {
      updateFontSize(current - 1);
    }
  };

  const handleIncrease = () => {
    const current = parseInt(inputValue, 10) || 16;
    updateFontSize(current + 1);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-x-0.5">
      {/* Minus Button */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleDecrease}
        title="Decrease font size"
        aria-label="Decrease font size"
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] transition-colors cursor-pointer text-neutral-600"
      >
        <Minus size={14} />
      </button>

      {/* Input container */}
      <div className="relative">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleInputKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          className="h-7 w-12 text-center text-sm font-medium bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0b57d0] focus:border-[#0b57d0] transition-shadow text-neutral-800"
        />

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 max-h-60 overflow-y-auto w-16 rounded-md border border-neutral-200 bg-white p-1 shadow-lg flex flex-col gap-y-0.5 scrollbar-thin">
            {PRESET_FONT_SIZES.map((sizeStr) => {
              const numericSize = parseInt(sizeStr, 10);
              const active = parseInt(currentFontSize, 10) === numericSize;

              return (
                <button
                  key={sizeStr}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur
                  }}
                  onClick={() => {
                    updateFontSize(numericSize);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full py-1 text-center text-xs font-medium rounded hover:bg-[#e2e7eb] transition-colors cursor-pointer text-neutral-700",
                    active && "bg-[#d3e3fd] text-[#0b57d0] font-semibold"
                  )}
                >
                  {numericSize}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Plus Button */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleIncrease}
        title="Increase font size"
        aria-label="Increase font size"
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] transition-colors cursor-pointer text-neutral-600"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export default FontSizeButton;
