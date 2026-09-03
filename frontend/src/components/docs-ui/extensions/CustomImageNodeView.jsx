import { useEffect, useRef, useState, useCallback } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { CloudUpload, ImageIcon, LoaderCircle, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { resolveImageUrl, addPersisted } from "./imageStore";
import api from "@/lib/api";
import { useParams } from "react-router-dom";

/* ---------------------------------------------------------
   Constants
--------------------------------------------------------- */
const MIN_WIDTH = 48;
const DEBOUNCE_MS = 300;

/* ---------------------------------------------------------
   Skeleton / Shimmer
--------------------------------------------------------- */
const ImageSkeleton = ({ width, height, label = "Loading image", showUploadIcon = false }) => {
  const skeletonWidth = width ? `${width}px` : "256px";
  const skeletonHeight = height ? `${height}px` : "160px";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm"
      style={{ width: skeletonWidth, height: skeletonHeight }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100" />
      <div className="absolute inset-y-0 -left-[40%] w-[40%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/70 to-transparent animate-[image-shimmer_1.6s_ease-in-out_infinite]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="mb-3 grid h-12 w-12 place-items-center rounded-xl bg-white/70 shadow-sm ring-1 ring-slate-200/70">
          {showUploadIcon ? <CloudUpload className="h-6 w-6 text-slate-400" /> : <ImageIcon className="h-6 w-6 text-slate-400" />}
        </div>
        <div className="flex items-center gap-2">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-500" />
          <span className="text-xs font-medium text-slate-500">{label}</span>
        </div>
        <div className="mt-3 h-1.5 w-20 overflow-hidden rounded-full bg-slate-300/70">
          <div className="h-full w-1/2 rounded-full bg-white/80 animate-[skeleton-progress_1.4s_ease-in-out_infinite]" />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #0b57d0 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />
    </div>
  );
};

/* ---------------------------------------------------------
   Error State
--------------------------------------------------------- */
const ImageError = ({ width, height }) => (
  <div
    className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 text-xs text-red-500"
    style={{
      width: width ? `${width}px` : "256px",
      height: height ? `${height}px` : "160px",
    }}
  >
    <span className="text-lg">⚠️</span>
    <span className="font-medium">Failed to load image</span>
  </div>
);

/* ---------------------------------------------------------
   Resize Handle
--------------------------------------------------------- */
const ResizeHandle = ({ side, onPointerDown, visible, isActive }) => (
  <div
    onPointerDown={(e) => onPointerDown(e, side)}
    style={{
      position: "absolute",
      top: "50%",
      transform: "translateY(-50%)",
      ...(side === "left" ? { left: -12 } : { right: -12 }),
      zIndex: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      width: 24,
      height: 48,
      borderRadius: 9999,
      background: isActive ? "#e2e8f0" : "white",
      boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
      border: isActive ? "2px solid #94a3b8" : "1px solid #e2e8f0",
      cursor: "col-resize",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.15s ease, background 0.15s ease, border 0.15s ease",
      userSelect: "none",
      pointerEvents: visible ? "auto" : "none",
    }}
  >
    <div style={{ display: "flex", gap: 3 }}>
      <div style={{ width: 3, height: 20, borderRadius: 9999, background: isActive ? "#64748b" : "#94a3b8" }} />
      <div style={{ width: 3, height: 20, borderRadius: 9999, background: isActive ? "#64748b" : "#94a3b8" }} />
    </div>
  </div>
);

/* ---------------------------------------------------------
   Alignment Toolbar
--------------------------------------------------------- */
const AlignmentToolbar = ({ currentAlignment, onAlign }) => {
  const alignOptions = [
    { value: "left", icon: <AlignLeft size={16} /> },
    { value: "center", icon: <AlignCenter size={16} /> },
    { value: "right", icon: <AlignRight size={16} /> },
  ];

  return (
    <div
      style={{
        position: "absolute",
        top: 8,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: 2,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(4px)",
        padding: 4,
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
        zIndex: 30,
        border: "1px solid rgba(226, 232, 240, 0.8)",
      }}
    >
      {alignOptions.map(({ value, icon }) => (
        <button
          key={value}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAlign(value);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 30,
            height: 30,
            borderRadius: 6,
            background: currentAlignment === value ? "#e2e8f0" : "transparent",
            color: currentAlignment === value ? "#1e293b" : "#64748b",
            border: "none",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          title={`Align ${value}`}
        >
          {icon}
        </button>
      ))}
    </div>
  );
};

/* ---------------------------------------------------------
   Main Tiptap NodeView
--------------------------------------------------------- */
const CustomImageNodeView = ({ node, updateAttributes }) => {
  const { docId } = useParams();

  const { assetId, uploadId, src, width, height, alt, title, alignment = "center" } = node.attrs;

  const [fetchedImage, setFetchedImage] = useState(null);
  const [failedResourceKey, setFailedResourceKey] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);

  const [localWidth, setLocalWidth] = useState(width);
  const [isHovered, setIsHovered] = useState(false);
  const [isDraggingState, setIsDraggingState] = useState(false);

  useEffect(() => {
    setLocalWidth(width);
  }, [width]);

  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartWidth = useRef(0);
  const dragSide = useRef("right");
  const containerRef = useRef(null);
  const debounceTimer = useRef(null);

  const isPendingUpload = Boolean(uploadId);

  const immediateSrc = resolveImageUrl({ assetId, uploadId, src });
  const resourceKey = assetId || src || uploadId;

  const resolvedSrc = immediateSrc || (fetchedImage?.assetId === assetId ? fetchedImage.url : null);

  const fetchError = failedResourceKey === resourceKey;
  const imageLoaded = loadedSrc === resolvedSrc;

  /* -------------------------------------------------------
     Fetch signed URL when only assetId exists
  ------------------------------------------------------- */
  useEffect(() => {
    if (immediateSrc || !assetId) return undefined;

    let cancelled = false;

    async function fetchImageUrl() {
      try {
        if (cancelled) return;
        const response = await api.get(`/documents/${docId}/asseturl/${assetId}`);
        const { url } = response.data;
        addPersisted(assetId, url);
        setFetchedImage({ assetId, url });
      } catch {
        if (!cancelled) setFailedResourceKey(assetId);
      }
    }

    fetchImageUrl();
    return () => { cancelled = true; };
  }, [assetId, immediateSrc]);

  /* -------------------------------------------------------
     Resize logic
  ------------------------------------------------------- */
  const commitWidth = useCallback(
    (newWidth) => {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        updateAttributes({ width: newWidth });
      }, DEBOUNCE_MS);
    },
    [updateAttributes]
  );

  const handlePointerDown = useCallback((e, side) => {
    e.preventDefault();
    e.stopPropagation();

    const currentWidth = containerRef.current?.offsetWidth || localWidth || 256;

    isDragging.current = true;
    setIsDraggingState(true);
    dragStartX.current = e.clientX;
    dragStartWidth.current = currentWidth;
    dragSide.current = side;

    // Stable max width: use the editor's content area (ProseMirror)
    const editorContent = containerRef.current?.closest(".ProseMirror");
    const maxWidth = editorContent ? editorContent.clientWidth : containerRef.current?.parentElement?.offsetWidth || Infinity;

    const onPointerMove = (moveEvent) => {
      if (!isDragging.current) return;

      const deltaX = moveEvent.clientX - dragStartX.current;
      const signedDelta = side === "right" ? deltaX : -deltaX;
      const newWidth = Math.min(Math.max(dragStartWidth.current + signedDelta, MIN_WIDTH), maxWidth);

      setLocalWidth(Math.round(newWidth));
      commitWidth(Math.round(newWidth));
    };

    const onPointerUp = () => {
      isDragging.current = false;
      setIsDraggingState(false);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);

      clearTimeout(debounceTimer.current);
      const finalWidth = containerRef.current?.offsetWidth;
      if (finalWidth) {
        updateAttributes({ width: Math.round(finalWidth) });
      }
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }, [commitWidth, updateAttributes, localWidth]);

  useEffect(() => {
    return () => clearTimeout(debounceTimer.current);
  }, []);

  const handleAlign = useCallback(
    (value) => {
      updateAttributes({ alignment: value });
    },
    [updateAttributes]
  );

  /* -------------------------------------------------------
     Error
  ------------------------------------------------------- */
  if (fetchError) {
    return (
      <NodeViewWrapper as="div" style={{ display: "block", textAlign: alignment }}>
        <ImageError width={localWidth} height={height} />
      </NodeViewWrapper>
    );
  }

  /* -------------------------------------------------------
     No URL yet — skeleton
  ------------------------------------------------------- */
  if (!resolvedSrc) {
    return (
      <NodeViewWrapper as="div" style={{ display: "block", textAlign: alignment }}>
        <ImageSkeleton
          width={localWidth}
          height={height}
          label={isPendingUpload ? "Uploading image" : "Preparing image"}
          showUploadIcon={isPendingUpload}
        />
      </NodeViewWrapper>
    );
  }

  /* -------------------------------------------------------
     Render image with resize handles & alignment toolbar
  ------------------------------------------------------- */
  const showSkeleton = !imageLoaded;

  return (
    <NodeViewWrapper as="div" style={{ display: "block", textAlign: alignment }}>
      <div
        ref={containerRef}
        className="relative inline-block align-top rounded-2xl"
        style={{
          width: localWidth ? `${localWidth}px` : undefined,
          maxWidth: "none",
          overflow: "visible",
          transition: isDraggingState ? "none" : "width 0.2s ease",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Left resize handle */}
        <ResizeHandle
          side="left"
          onPointerDown={handlePointerDown}
          visible={isHovered || isDraggingState}
          isActive={isDraggingState && dragSide.current === "left"}
        />

        {/* Actual image */}
        <img
          key={resolvedSrc}
          src={resolvedSrc}
          alt={alt || ""}
          title={title || undefined}
          width={localWidth || undefined}
          height={height || undefined}
          draggable={false}
          onLoad={() => setLoadedSrc(resolvedSrc)}
          onError={() => setFailedResourceKey(resourceKey)}
          className={`
            block
            h-auto
            max-w-full
            transition-opacity
            duration-500
            ease-out
            rounded-2xl
            ${showSkeleton ? "opacity-0" : "opacity-100"}
            ${isDraggingState ? "ring-2 ring-blue-500 ring-offset-2" : ""}
          `}
        />

        {/* Width tooltip while dragging */}
        {isDraggingState && localWidth && (
          <div
            style={{
              position: "absolute",
              top: -32,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1e293b",
              color: "white",
              fontSize: 12,
              padding: "4px 10px",
              borderRadius: 6,
              pointerEvents: "none",
              whiteSpace: "nowrap",
              zIndex: 20,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {localWidth}px
          </div>
        )}

        {/* Skeleton overlay while image loads */}
        {showSkeleton && (
          <div className="absolute inset-0">
            <ImageSkeleton width="100%" height="100%" label="Loading image" showUploadIcon={false} />
          </div>
        )}

        {/* Right resize handle */}
        <ResizeHandle
          side="right"
          onPointerDown={handlePointerDown}
          visible={isHovered || isDraggingState}
          isActive={isDraggingState && dragSide.current === "right"}
        />

        {/* Alignment toolbar on hover */}
        {(isHovered || isDraggingState) && !showSkeleton && (
          <AlignmentToolbar currentAlignment={alignment} onAlign={handleAlign} />
        )}
      </div>
    </NodeViewWrapper>
  );
};

export default CustomImageNodeView;