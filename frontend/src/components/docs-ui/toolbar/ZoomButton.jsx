import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils.js";
import { useZoom } from "../context/ZoomContext";

const PRESET_ZOOM_LEVELS = [
  50, 75, 90, 100, 125, 150, 175, 200
];

const ZoomButton = () => {
  const { zoom, updateZoom, zoomIn, zoomOut } = useZoom();
  const [inputValue, setInputValue] = useState(String(zoom));
  const [isFocused, setIsFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Sync input value with zoom state
  useEffect(() => {
    if (!isFocused) {
      setInputValue(String(zoom));
    }
  }, [zoom, isFocused]);

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

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === "Enter") {
      updateZoom(inputValue);
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
    updateZoom(inputValue);
  };

  const handleDecrease = () => {
    zoomOut(10);
  };

  const handleIncrease = () => {
    zoomIn(10);
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center gap-x-0.5">
      {/* Minus Button */}
      <button
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={handleDecrease}
        title="Zoom out"
        aria-label="Zoom out"
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
          className="h-7 w-14 text-center text-sm font-medium bg-white border border-neutral-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0b57d0] focus:border-[#0b57d0] transition-shadow text-neutral-800"
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-neutral-500 pointer-events-none">
          %
        </span>

        {/* Dropdown Menu */}
        {dropdownOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full z-50 mt-1 max-h-60 overflow-y-auto w-20 rounded-md border border-neutral-200 bg-white p-1 shadow-lg flex flex-col gap-y-0.5 scrollbar-thin">
            {PRESET_ZOOM_LEVELS.map((level) => {
              const active = zoom === level;

              return (
                <button
                  key={level}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault(); // prevent input blur
                  }}
                  onClick={() => {
                    updateZoom(level);
                    setDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full py-1 text-center text-xs font-medium rounded hover:bg-[#e2e7eb] transition-colors cursor-pointer text-neutral-700",
                    active && "bg-[#d3e3fd] text-[#0b57d0] font-semibold"
                  )}
                >
                  {level}%
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
        title="Zoom in"
        aria-label="Zoom in"
        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-[#e2e7eb] transition-colors cursor-pointer text-neutral-600"
      >
        <Plus size={14} />
      </button>
    </div>
  );
};

export default ZoomButton;
