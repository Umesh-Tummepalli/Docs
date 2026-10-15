import { useCallback, useEffect, useRef, useState } from "react";
import useYDoc from "./context/YDocContext";

const PAGE_WIDTH = 794;
const MIN_MARGIN = 24;
const MIN_CONTENT_WIDTH = 240;
const MARKER_COUNT = 83;
const DEBOUNCE_MS = 300;

const DEFAULT_LEFT = 48;
const DEFAULT_RIGHT = 48;
const DEFAULT_TOP = 96;
const DEFAULT_BOTTOM = 96;

const markers = Array.from({ length: MARKER_COUNT }, (_, index) => index);

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

/** Read margins from the yDoc metadata map, falling back to defaults. */
function readMarginsFromMap(metaMap) {
  const left = metaMap.get("marginLeft") ?? DEFAULT_LEFT;
  const right = metaMap.get("marginRight") ?? DEFAULT_RIGHT;
  const top = metaMap.get("marginTop") ?? DEFAULT_TOP;
  const bottom = metaMap.get("marginBottom") ?? DEFAULT_BOTTOM;
  return { left, right, top, bottom };
}

/** Apply margin values to CSS custom properties on :root. */
function applyMarginsToCss({ left, right, top, bottom }) {
  document.documentElement.style.setProperty("--page-margin-left", `${left}px`);
  document.documentElement.style.setProperty("--page-margin-right", `${right}px`);
  document.documentElement.style.setProperty("--page-margin-top", `${top}px`);
  document.documentElement.style.setProperty("--page-margin-bottom", `${bottom}px`);
}

const Ruler = () => {
  const { yDoc, synced } = useYDoc();

  const rulerRef = useRef(null);
  const [activeHandle, setActiveHandle] = useState(null);
  const [margins, setMargins] = useState({
    left: DEFAULT_LEFT,
    right: DEFAULT_RIGHT,
    top: DEFAULT_TOP,
    bottom: DEFAULT_BOTTOM,
  });

  // Always in sync with latest margins so drag callbacks never close over stale values.
  const marginsRef = useRef({
    left: DEFAULT_LEFT,
    right: DEFAULT_RIGHT,
    top: DEFAULT_TOP,
    bottom: DEFAULT_BOTTOM,
  });

  // Debounce timer for writing to yDoc.
  const debounceRef = useRef(null);

  // Stable reference to the metadata map — created once per yDoc lifetime.
  const metaMap = yDoc.getMap("metadata");

  // ─── 1. Read initial state from yDoc once synced ─────────────────────────
  useEffect(() => {
    if (!synced) return;

    const currentMargins = readMarginsFromMap(metaMap);
    marginsRef.current = currentMargins;
    // The synchronized Y.Doc is an external source of truth for this state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMargins(currentMargins);
    applyMarginsToCss(currentMargins);

    yDoc.transact(() => {
      for (const [key, value] of Object.entries({
        marginLeft: currentMargins.left,
        marginRight: currentMargins.right,
        marginTop: currentMargins.top,
        marginBottom: currentMargins.bottom,
      })) {
        if (metaMap.get(key) == null) metaMap.set(key, value);
      }
    });
  }, [synced, metaMap, yDoc]);

  // ─── 2. Observe yDoc map for remote changes ───────────────────────────────
  useEffect(() => {
    const handleMapChange = () => {
      const currentMargins = readMarginsFromMap(metaMap);

      // Only update if the values actually changed to avoid unnecessary re-renders.
      if (Object.keys(currentMargins).some((key) => currentMargins[key] !== marginsRef.current[key])) {
        marginsRef.current = currentMargins;
        setMargins(currentMargins);
        applyMarginsToCss(currentMargins);
      }
    };

    metaMap.observe(handleMapChange);
    return () => metaMap.unobserve(handleMapChange);
  }, [metaMap]);

  // ─── 3. Debounced write to yDoc ───────────────────────────────────────────
  const scheduleYDocWrite = useCallback(
    (nextMargins) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        // Batch into a single Y.js transaction so it emits one docUpdate event.
        yDoc.transact(() => {
          metaMap.set("marginLeft", nextMargins.left);
          metaMap.set("marginRight", nextMargins.right);
          metaMap.set("marginTop", nextMargins.top);
          metaMap.set("marginBottom", nextMargins.bottom);
        });
      }, DEBOUNCE_MS);
    },
    [yDoc, metaMap]
  );

  // ─── 4. Drag logic ────────────────────────────────────────────────────────
  const updateMargin = useCallback(
    (side, clientX) => {
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

      const updated = { ...marginsRef.current, left: newLeft, right: newRight };
      marginsRef.current = updated;
      setMargins(updated);
      applyMarginsToCss(updated);

      // Schedule debounced write to yDoc so collaborators get the update.
      scheduleYDocWrite(updated);
    },
    [scheduleYDocWrite]
  );

  const startDragging = (side) => (event) => {
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const pointerId = event.pointerId;

    if (target.setPointerCapture) {
      target.setPointerCapture(pointerId);
    }

    setActiveHandle(side);
    updateMargin(side, event.clientX);

    const handlePointerMove = (e) => {
      if (e.pointerId !== pointerId) return;
      e.preventDefault();
      updateMargin(side, e.clientX);
    };

    const handlePointerUp = (e) => {
      if (e.pointerId !== pointerId) return;

      target.removeEventListener("pointermove", handlePointerMove);
      target.removeEventListener("pointerup", handlePointerUp);
      target.removeEventListener("pointercancel", handlePointerUp);

      if (target.releasePointerCapture && target.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture(pointerId);
      }

      // Flush debounce immediately on pointer up so the final position is
      // written to yDoc right away rather than waiting the full debounce delay.
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
      const currentMargins = marginsRef.current;
      yDoc.transact(() => {
        metaMap.set("marginLeft", currentMargins.left);
        metaMap.set("marginRight", currentMargins.right);
        metaMap.set("marginTop", currentMargins.top);
        metaMap.set("marginBottom", currentMargins.bottom);
      });

      setActiveHandle(null);
    };

    target.addEventListener("pointermove", handlePointerMove);
    target.addEventListener("pointerup", handlePointerUp);
    target.addEventListener("pointercancel", handlePointerUp);
  };

  // ─── 5. Cleanup debounce timer on unmount ─────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ─── 6. Render ────────────────────────────────────────────────────────────
  const renderMarginHandle = (side) => {
    const isLeft = side === "left";
    const position = isLeft ? margins.left : PAGE_WIDTH - margins.right;

    return (
      <div
        key={side}
        aria-label={`${side} margin`}
        className={`absolute bottom-0 z-10 h-6 w-4 -translate-x-1/2 cursor-ew-resize ${
          activeHandle === side ? "ring-2 ring-blue-500" : ""
        }`}
        style={{
          left: `${position}px`,
          touchAction: "none",
          pointerEvents: "auto",
        }}
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
      style={{ width: `${PAGE_WIDTH}px` }}
    >
      <div
        ref={rulerRef}
        className="relative mx-auto h-full w-full"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className="absolute inset-y-0 bg-blue-100/60"
          style={{
            left: `${margins.left}px`,
            right: `${margins.right}px`,
            pointerEvents: "none",
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
