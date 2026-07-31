import { useCallback, useEffect, useRef, useState } from "react";

import { useEditorContext } from "./context/EditorContext";

const PAGE_WIDTH = 794;
const DEFAULT_MARGIN = 56;
const MIN_MARGIN = 24;
const MIN_CONTENT_WIDTH = 240;
const MARKER_COUNT = 83;

const markers = Array.from({ length: MARKER_COUNT }, (_, index) => index);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const withoutHorizontalPadding = (style = "") =>
  style
    .split(";")
    .map((rule) => rule.trim())
    .filter(
      (rule) =>
        rule &&
        !rule.startsWith("padding-left") &&
        !rule.startsWith("padding-right"),
    )
    .join("; ");

const Ruler = () => {
  const editor = useEditorContext();
  const rulerRef = useRef(null);
  const activeHandleRef = useRef(null);
  const [activeHandle, setActiveHandle] = useState(null);
  const [margins, setMargins] = useState({
    left: DEFAULT_MARGIN,
    right: DEFAULT_MARGIN,
  });

  useEffect(() => {
    if (!editor) return;

    const editorProps = editor.options.editorProps ?? {};
    const attributes = editorProps.attributes ?? {};
    const baseStyle = withoutHorizontalPadding(attributes.style);
    const paddingStyle = `padding-left: ${margins.left}px; padding-right: ${margins.right}px`;

    editor.setOptions({
      editorProps: {
        ...editorProps,
        attributes: {
          ...attributes,
          style: baseStyle ? `${baseStyle}; ${paddingStyle}` : paddingStyle,
        },
      },
    });
  }, [editor, margins]);

  const updateMargin = useCallback((side, clientX) => {
    const ruler = rulerRef.current;
    if (!ruler) return;

    const rect = ruler.getBoundingClientRect();
    const pointerX = clamp(clientX - rect.left, 0, PAGE_WIDTH);

    setMargins((current) => {
      if (side === "left") {
        const maxLeft = PAGE_WIDTH - current.right - MIN_CONTENT_WIDTH;

        return {
          ...current,
          left: clamp(pointerX, MIN_MARGIN, maxLeft),
        };
      }

      const proposedRight = PAGE_WIDTH - pointerX;
      const maxRight = PAGE_WIDTH - current.left - MIN_CONTENT_WIDTH;

      return {
        ...current,
        right: clamp(proposedRight, MIN_MARGIN, maxRight),
      };
    });
  }, []);

  useEffect(() => {
    const handlePointerMove = (event) => {
      if (!activeHandleRef.current) return;
      updateMargin(activeHandleRef.current, event.clientX);
    };

    const stopDragging = () => {
      activeHandleRef.current = null;
      setActiveHandle(null);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [updateMargin]);

  const startDragging = (side) => (event) => {
    event.preventDefault();
    activeHandleRef.current = side;
    setActiveHandle(side);
    updateMargin(side, event.clientX);
  };

  const renderMarginHandle = (side) => {
    const isLeft = side === "left";
    const position = isLeft ? margins.left : PAGE_WIDTH - margins.right;

    return (
      <button
        type="button"
        aria-label={`${side} margin`}
        className="absolute bottom-0 z-10 h-6 w-3 -translate-x-1/2 cursor-ew-resize rounded-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        style={{ left: `${position}px` }}
        onPointerDown={startDragging(side)}
      >
        <span
          className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 ${
            activeHandle === side ? "bg-blue-600" : "bg-blue-500"
          }`}
        />
        <span
          className={`absolute left-1/2 top-0 h-0 w-0 -translate-x-1/2 border-x-[5px] border-b-[7px] border-x-transparent ${
            activeHandle === side ? "border-b-blue-600" : "border-b-blue-500"
          }`}
        />
      </button>
    );
  };

  return (
    <div className="h-7 border-b border-gray-300 bg-[#f9fbfd] select-none">
      <div
        ref={rulerRef}
        className="relative mx-auto h-full"
        style={{ width: `${PAGE_WIDTH}px` }}
      >
        <div
          className="absolute inset-y-0 bg-blue-100/60"
          style={{
            left: `${margins.left}px`,
            right: `${margins.right}px`,
          }}
        />

        {markers.map((marker) => {
          const position = (marker * PAGE_WIDTH) / (MARKER_COUNT - 1);
          const isMajor = marker % 10 === 0;
          const isMid = marker % 5 === 0;

          return (
            <div
              key={marker}
              className="absolute bottom-0"
              style={{ left: `${position}px` }}
            >
              <div
                className={`w-px bg-neutral-500 ${
                  isMajor ? "h-2.5" : isMid ? "h-2" : "h-1"
                }`}
              />
              {isMajor && (
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[10px] leading-none text-neutral-500">
                  {marker / 10 + 1}
                </span>
              )}
            </div>
          );
        })}

        {renderMarginHandle("left")}
        {renderMarginHandle("right")}
      </div>
    </div>
  );
};

export default Ruler;
