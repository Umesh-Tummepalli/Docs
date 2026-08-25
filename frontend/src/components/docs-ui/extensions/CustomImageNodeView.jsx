import { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import {
  CloudUpload,
  ImageIcon,
  LoaderCircle,
} from "lucide-react";
import { resolveImageUrl, addPersisted } from "./imageStore";
import api from "@/lib/api";
import { useParams } from "react-router-dom";

/* ---------------------------------------------------------
   Skeleton / Shimmer
--------------------------------------------------------- */
const ImageSkeleton = ({
  width,
  height,
  label = "Loading image",
  showUploadIcon = false,
}) => {
  const skeletonWidth = width ? `${width}px` : "256px";
  const skeletonHeight = height ? `${height}px` : "160px";

  return (
    <div
      className="
        relative
        overflow-hidden
        rounded-2xl
        border
        border-slate-200
        bg-slate-100
        shadow-sm
      "
      style={{
        width: skeletonWidth,
        height: skeletonHeight,
      }}
    >
      {/* Base skeleton */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-100 via-slate-200/70 to-slate-100" />

      {/* Moving shimmer */}
      <div
        className="
          absolute
          inset-y-0
          -left-[40%]
          w-[40%]
          skew-x-[-18deg]
          bg-gradient-to-r
          from-transparent
          via-white/70
          to-transparent
          animate-[image-shimmer_1.6s_ease-in-out_infinite]
        "
      />

      {/* Fake image structure */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="
            mb-3
            grid
            h-12
            w-12
            place-items-center
            rounded-xl
            bg-white/70
            shadow-sm
            ring-1
            ring-slate-200/70
          "
        >
          {showUploadIcon ? (
            <CloudUpload className="h-6 w-6 text-slate-400" />
          ) : (
            <ImageIcon className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <div className="flex items-center gap-2">
          <LoaderCircle className="h-3.5 w-3.5 animate-spin text-slate-500" />

          <span className="text-xs font-medium text-slate-500">
            {label}
          </span>
        </div>

        {/* Small skeleton line */}
        <div className="mt-3 h-1.5 w-20 overflow-hidden rounded-full bg-slate-300/70">
          <div
            className="
              h-full
              w-1/2
              rounded-full
              bg-white/80
              animate-[skeleton-progress_1.4s_ease-in-out_infinite]
            "
          />
        </div>
      </div>

      {/* Subtle grid texture */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, #0b57d0 1px, transparent 0)",
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
    className="
      flex
      flex-col
      items-center
      justify-center
      gap-2
      rounded-2xl
      border
      border-red-200
      bg-red-50
      px-4
      text-xs
      text-red-500
    "
    style={{
      width: width ? `${width}px` : "256px",
      height: height ? `${height}px` : "160px",
    }}
  >
    <span className="text-lg">⚠️</span>

    <span className="font-medium">
      Failed to load image
    </span>
  </div>
);

/* ---------------------------------------------------------
   Main Tiptap NodeView
--------------------------------------------------------- */

/** Resolves local previews and signed image URLs for a Tiptap image node. */
const CustomImageNodeView = ({ node }) => {
  const { docId } = useParams();
  
  const {
    assetId,
    uploadId,
    src,
    width,
    height,
    alt,
    title,
  } = node.attrs;

  const [fetchedImage, setFetchedImage] = useState(null);
  const [failedResourceKey, setFailedResourceKey] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);

  const isPendingUpload = Boolean(uploadId);

  const immediateSrc = resolveImageUrl({
    assetId,
    uploadId,
    src,
  });

  const resourceKey = assetId || src || uploadId;

  const resolvedSrc =
    immediateSrc ||
    (fetchedImage?.assetId === assetId
      ? fetchedImage.url
      : null);

  const fetchError =
    failedResourceKey === resourceKey;

  const imageLoaded =
    loadedSrc === resolvedSrc;

  /* -------------------------------------------------------
     Fetch signed URL when only assetId exists
  ------------------------------------------------------- */

  useEffect(() => {
    if (immediateSrc || !assetId) {
      return undefined;
    }

    let cancelled = false;

    async function fetchImageUrl() {
      try {
        if (cancelled) return;
        const response = await api.get(
          `/documents/${docId}/asseturl/${assetId}`
        );
        
        const { url } = response.data;

        addPersisted(assetId, url);

        setFetchedImage({
          assetId,
          url,
        });
      } catch {
        if (!cancelled) {
          setFailedResourceKey(assetId);
        }
      }
    }

    fetchImageUrl();

    return () => {
      cancelled = true;
    };
  }, [assetId, immediateSrc]);

  /* -------------------------------------------------------
     Error
  ------------------------------------------------------- */

  if (fetchError) {
    return (
      <NodeViewWrapper
        as="div"
        className="inline-block align-top"
      >
        <ImageError
          width={width}
          height={height}
        />
      </NodeViewWrapper>
    );
  }

  /* -------------------------------------------------------
     No URL yet
  ------------------------------------------------------- */

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper
        as="div"
        className="inline-block align-top"
      >
        <ImageSkeleton
          width={width}
          height={height}
          label={
            isPendingUpload
              ? "Uploading image"
              : "Preparing image"
          }
          showUploadIcon={isPendingUpload}
        />
      </NodeViewWrapper>
    );
  }

  /* -------------------------------------------------------
     URL exists but actual image isn't loaded yet
  ------------------------------------------------------- */

  // Show skeleton overlay only while the <img> tag itself hasn't loaded yet.
  // Don't force-show skeleton during a pending upload — the local blob URL
  // already gives us an immediate preview, so the user sees the image right away.
  const showSkeleton = !imageLoaded;

  return (
    <NodeViewWrapper
      as="div"
      className="
        relative
        inline-block
        max-w-full
        align-top
        overflow-hidden
        rounded-2xl
      "
    >
      {/* Actual image */}
      <img
        key={resolvedSrc}
        src={resolvedSrc}
        alt={alt || ""}
        title={title || undefined}
        width={width || undefined}
        height={height || undefined}
        draggable={false}
        onLoad={() => {
          setLoadedSrc(resolvedSrc);
        }}
        onError={() => {
          setFailedResourceKey(resourceKey);
        }}
        className={`
          block
          h-auto
          max-w-full
          transition-all
          duration-500
          ease-out
          ${
            showSkeleton
              ? "scale-[1.015] opacity-0"
              : "scale-100 opacity-100"
          }
        `}
      />

      {/* Skeleton over image while loading */}
      {showSkeleton && (
        <div className="absolute inset-0">
          <ImageSkeleton
            width="100%"
            height="100%"
            label="Loading image"
            showUploadIcon={false}
          />
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default CustomImageNodeView;