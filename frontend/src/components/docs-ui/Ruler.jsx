import { useCallback, useEffect, useRef, useState } from "react";
import { useEditorContext } from "./context/EditorContext";

const PAGE_WIDTH = 794;
const MIN_MARGIN = 24;
const MIN_CONTENT_WIDTH = 240;
const MARKER_COUNT = 83;

const markers = Array.from({ length: MARKER_COUNT }, (_, index) => index);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const Ruler = () => {
  const editor = useEditorContext();
  const rulerRef = useRef(null);
  const [activeHandle, setActiveHandle] = useState(null);
  const [margins, setMargins] = useState({ left: 48, right: 48 });
  const marginsRef = useRef({ left: 48, right: 48 });

  // Initialize margins from the extension on load
  useEffect(() => {
    if (!editor) return;
    const pageExtension = editor.extensionManager.extensions.find(e => e.name === 'PageExtension');
    if (pageExtension && pageExtension.options?.pageLayout?.margins) {
      const leftInches = pageExtension.options.pageLayout.margins.left?.value || 0.5;
      const rightInches = pageExtension.options.pageLayout.margins.right?.value || 0.5;
      const leftPx = leftInches * 96;
      const rightPx = rightInches * 96;
      setMargins({ left: leftPx, right: rightPx });
      marginsRef.current = { left: leftPx, right: rightPx };
      document.documentElement.style.setProperty('--page-margin-left', `${leftPx}px`);
      document.documentElement.style.setProperty('--page-margin-right', `${rightPx}px`);
    }
  }, [editor]);

  const updateMargin = useCallback((side, clientX) => {
    const ruler = rulerRef.current;
    if (!ruler) return;

    const rect = ruler.getBoundingClientRect();
    const pointerX = clamp(clientX - rect.left, 0, PAGE_WIDTH);

    let newLeft = marginsRef.current.left;
    let newRight = marginsRef.current.right;

    if (side === "left") {
      const maxLeft = PAGE_WIDTH - newRight - MIN_CONTENT_WIDTH;
      newLeft = clamp(pointerX, MIN_MARGIN, maxLeft);
    } else {
      const proposedRight = PAGE_WIDTH - pointerX;
      const maxRight = PAGE_WIDTH - newLeft - MIN_CONTENT_WIDTH;
      newRight = clamp(proposedRight, MIN_MARGIN, maxRight);
    }

    const updatedMargins = { left: newLeft, right: newRight };
    marginsRef.current = updatedMargins;
    setMargins(updatedMargins);

    document.documentElement.style.setProperty('--page-margin-left', `${newLeft}px`);
    document.documentElement.style.setProperty('--page-margin-right', `${newRight}px`);
  }, []);

  const applyMarginsToEditor = useCallback(() => {
    if (!editor) return;
    const pageExtension = editor.extensionManager.extensions.find(e => e.name === 'PageExtension');
    if (pageExtension) {
      const currentOptions = pageExtension.options;
      const currentMargins = currentOptions.pageLayout?.margins || {
        top: { unit: 'INCHES', value: 0.75 },
        bottom: { unit: 'INCHES', value: 0.75 }
      };

      pageExtension.options = {
        ...currentOptions,
        pageLayout: {
          ...currentOptions.pageLayout,
          margins: {
            ...currentMargins,
            left: { unit: 'INCHES', value: marginsRef.current.left / 96 },
            right: { unit: 'INCHES', value: marginsRef.current.right / 96 }
          }
        }
      };
      
      editor.commands.recomputeComputedHtml();
    }
  }, [editor]);

  // Robust inline Drag Handler
  const startDragging = (side) => (event) => {
    event.preventDefault(); // Prevent text selection
    event.stopPropagation(); // Stop React's synthetic bubbling
    
    const target = event.currentTarget;
    const pointerId = event.pointerId;

    // 1. Capture the pointer. This routes all mouse/touch events strictly 
    // to this specific handle even if you drag completely outside the browser window.
    if (target.setPointerCapture) {
      try {
        target.setPointerCapture(pointerId);
      } catch (e) {
        // Safe fallback
      }
    }

    setActiveHandle(side);
    updateMargin(side, event.clientX);

    // 2. Define the move/up behaviors directly for this exact interaction
    const handlePointerMove = (e) => {
      if (e.pointerId !== pointerId) return;
      e.preventDefault(); // Stop mobile scrolling during drag
      updateMargin(side, e.clientX);
    };

    const handlePointerUp = (e) => {
      if (e.pointerId !== pointerId) return;

      // 3. Immediately clean up event listeners when the interaction ends
      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);

      if (target.releasePointerCapture) {
        try { target.releasePointerCapture(pointerId); } catch (err) {}
      }

      applyMarginsToEditor();
      setActiveHandle(null);
    };

    // 4. Attach the listeners directly to the captured target natively!
    // This totally bypasses the React container's stopPropagation.
    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  };

  const renderMarginHandle = (side) => {
    const isLeft = side === "left";
    const position = isLeft ? margins.left : PAGE_WIDTH - margins.right;

    return (
      <div
        key={side}
        aria-label={`${side} margin`}
        className={`absolute bottom-0 z-10 h-6 w-4 -translate-x-1/2 cursor-ew-resize ${
          activeHandle === side ? 'ring-2 ring-blue-500' : ''
        }`}
        style={{ 
          left: `${position}px`, 
          touchAction: "none", // CRUCIAL: Native CSS block to prevent mobile browser swiping/zooming on the handle
          pointerEvents: "auto"
        }}
        // Just one universal event needed!
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
      </div>
    );
  };

  return (
    <div
      className="z-40 h-7 border-b border-gray-300 bg-white select-none print:hidden mx-auto mt-2"
      style={{ position: "sticky", top: "72px", width: `${PAGE_WIDTH}px` }}
    >
      <div
        ref={rulerRef}
        className="relative mx-auto h-full w-full"
        onPointerDown={(e) => e.stopPropagation()} // This line caused your previous code's bug! (But it's totally safe with our new pattern)
      >
        <div
          className="absolute inset-y-0 bg-blue-100/60"
          style={{
            left: `${margins.left}px`,
            right: `${margins.right}px`,
            pointerEvents: "none"
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
              style={{ left: `${position}px`, pointerEvents: "none" }}
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