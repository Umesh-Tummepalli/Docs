import { useEffect, useRef } from "react";
import { useZoom } from "./context/ZoomContext";

/**
 * ZoomGestureHandler
 * 
 * Listens for zoom gestures and keyboard shortcuts:
 * - Ctrl + Plus/Equal (Zoom in)
 * - Ctrl + Minus (Zoom out)
 * - Ctrl + Scroll (Zoom in/out)
 * - Pinch gesture (Zoom in/out)
 */
const ZoomGestureHandler = () => {
  const { zoomIn, zoomOut, updateZoom, zoom } = useZoom();
  const pinchStartDistance = useRef(null);
  const pinchStartZoom = useRef(100);
  const isTouchPinching = useRef(false);

  useEffect(() => {
    // -------------------------------------------------------------------------
    // Keyboard shortcuts: Ctrl + Plus, Ctrl + Minus, Ctrl + 0 (reset)
    // -------------------------------------------------------------------------
    const handleKeyDown = (e) => {
      // Check for Ctrl (Windows/Linux) or Cmd (Mac)
      const isModifierPressed = e.ctrlKey || e.metaKey;

      if (!isModifierPressed) return;

      // Ctrl/Cmd + Plus/Equal (zoom in)
      if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        zoomIn(10);
      }
      // Ctrl/Cmd + Minus (zoom out)
      else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        zoomOut(10);
      }
      // Ctrl/Cmd + 0 (reset to 100%)
      else if (e.key === "0") {
        e.preventDefault();
        updateZoom(100);
      }
    };

    // -------------------------------------------------------------------------
    // Mouse wheel zoom: Ctrl + Scroll
    // -------------------------------------------------------------------------
    const handleWheel = (e) => {
      const isModifierPressed = e.ctrlKey || e.metaKey;

      if (!isModifierPressed) return;

      e.preventDefault();

      // deltaY is positive when scrolling down, negative when scrolling up
      // We want scrolling up to zoom in, scrolling down to zoom out
      const delta = -Math.sign(e.deltaY) * 10;

      if (delta > 0) {
        zoomIn(10);
      } else {
        zoomOut(10);
      }
    };

    // -------------------------------------------------------------------------
    // Touch pinch gesture
    // -------------------------------------------------------------------------
    const getTouchDistance = (touches) => {
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isTouchPinching.current = true;
        pinchStartDistance.current = getTouchDistance(e.touches);
        pinchStartZoom.current = zoom;
      }
    };

    const handleTouchMove = (e) => {
      if (!isTouchPinching.current || e.touches.length !== 2) return;

      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches);
      const distanceRatio = currentDistance / pinchStartDistance.current;

      // Apply dampening factor to make pinch gesture more gentle
      // Instead of direct ratio, we interpolate between 1.0 and the ratio
      // dampenFactor of 0.4 means only 40% of the change is applied
      const dampenFactor = 0.4;
      const dampenedRatio = 1 + (distanceRatio - 1) * dampenFactor;

      // Calculate new zoom based on dampened pinch ratio
      const newZoom = Math.round(pinchStartZoom.current * dampenedRatio);
      updateZoom(newZoom);
    };

    const handleTouchEnd = (e) => {
      if (e.touches.length < 2) {
        isTouchPinching.current = false;
        pinchStartDistance.current = null;
      }
    };

    // Add event listeners
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, { passive: false });
    document.addEventListener("touchstart", handleTouchStart, { passive: false });
    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);

    // Cleanup
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, [zoomIn, zoomOut, updateZoom, zoom]);

  // This component doesn't render anything
  return null;
};

export default ZoomGestureHandler;
