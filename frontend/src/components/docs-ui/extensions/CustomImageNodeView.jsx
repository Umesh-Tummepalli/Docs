import { useEffect, useState } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import { CloudUpload, ImageIcon, LoaderCircle } from "lucide-react";
import { resolveImageUrl, addPersisted } from "./imageStore";
import api from "@/lib/api";

const ImageLoadingOverlay = ({ label, showUploadIcon = false }) => (
  <div className="absolute inset-0 grid place-items-center overflow-hidden bg-gradient-to-br from-white/90 via-slate-50/90 to-blue-50/90 backdrop-blur-[2px]">
    <div className="absolute -left-8 -top-10 h-28 w-28 rounded-full bg-blue-300/20 blur-2xl animate-pulse" />
    <div className="absolute -bottom-10 -right-8 h-28 w-28 rounded-full bg-violet-300/20 blur-2xl animate-pulse [animation-delay:700ms]" />
    <div
      className="absolute inset-0 opacity-[0.045]"
      style={{
        backgroundImage: "radial-gradient(circle at 1px 1px, #0b57d0 1px, transparent 0)",
        backgroundSize: "18px 18px",
      }}
    />
    <div className="relative flex flex-col items-center gap-2 px-4 text-center">
      <div className="relative grid h-12 w-12 place-items-center rounded-2xl bg-white text-[#0b57d0] shadow-lg shadow-blue-200/60 ring-1 ring-blue-100">
        <div className="absolute -inset-1 rounded-[1.1rem] border border-blue-200/70 animate-[image-loader-ring_1.8s_ease-in-out_infinite]" />
        {showUploadIcon ? (
          <CloudUpload className="h-6 w-6 animate-[image-float_2.4s_ease-in-out_infinite]" />
        ) : (
          <ImageIcon className="h-6 w-6 animate-[image-float_2.4s_ease-in-out_infinite]" />
        )}
      </div>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#0b57d0]" />
        {label}
      </div>
      <div className="flex gap-1" aria-hidden="true">
        <span className="h-1.5 w-1.5 rounded-full bg-[#0b57d0] animate-bounce" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#0b57d0] animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-[#0b57d0] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  </div>
);

const ImagePlaceholder = ({ width, height, label, showUploadIcon }) => (
  <div
    className="relative overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-blue-50 shadow-sm"
    style={{
      width: width ? `${width}px` : "256px",
      height: height ? `${height}px` : "160px",
    }}
  >
    <ImageLoadingOverlay label={label} showUploadIcon={showUploadIcon} />
  </div>
);

/** Resolves local previews and signed image URLs for a Tiptap image node. */
const CustomImageNodeView = ({ node }) => {
  const { assetId, uploadId, src, width, height, alt, title } = node.attrs;
  const [fetchedImage, setFetchedImage] = useState(null);
  const [failedResourceKey, setFailedResourceKey] = useState(null);
  const [loadedSrc, setLoadedSrc] = useState(null);
  const isPendingUpload = Boolean(uploadId);
  const immediateSrc = resolveImageUrl({ assetId, uploadId, src });
  const resourceKey = assetId || src || uploadId;
  const resolvedSrc = immediateSrc || (
    fetchedImage?.assetId === assetId ? fetchedImage.url : null
  );
  const fetchError = failedResourceKey === resourceKey;
  const imageLoaded = loadedSrc === resolvedSrc;

  useEffect(() => {
    if (immediateSrc || !assetId) return undefined;

    let cancelled = false;

    async function fetchImageUrl() {
      try {
        const response = await api.get(`/documents/asseturl/${assetId}`);
        if (cancelled) return;
        const { url } = response.data;
        addPersisted(assetId, url);
        setFetchedImage({ assetId, url });
      } catch {
        if (!cancelled) setFailedResourceKey(assetId);
      }
    }

    fetchImageUrl();
    return () => {
      cancelled = true;
    };
  }, [assetId, immediateSrc]);

  if (fetchError) {
    return (
      <NodeViewWrapper as="div" className="inline-block align-top">
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-xs text-red-500"
          style={{
            width: width ? `${width}px` : "256px",
            height: height ? `${height}px` : "160px",
          }}
        >
          <span className="text-lg">⚠️</span>
          <span>Failed to load image</span>
        </div>
      </NodeViewWrapper>
    );
  }

  if (!resolvedSrc) {
    return (
      <NodeViewWrapper as="div" className="inline-block align-top">
        <ImagePlaceholder
          width={width}
          height={height}
          label={isPendingUpload ? "Uploading image" : "Preparing image"}
          showUploadIcon={isPendingUpload}
        />
      </NodeViewWrapper>
    );
  }

  const showOverlay = isPendingUpload || !imageLoaded;
  return (
    <NodeViewWrapper
      as="div"
      className="relative inline-block max-w-full align-top overflow-hidden rounded-xl"
    >
      <img
        key={resolvedSrc}
        src={resolvedSrc}
        alt={alt || ""}
        title={title || undefined}
        width={width || undefined}
        height={height || undefined}
        draggable={false}
        onLoad={() => setLoadedSrc(resolvedSrc)}
        onError={() => setFailedResourceKey(resourceKey)}
        className={`block h-auto max-w-full transition duration-300 ${
          showOverlay ? "scale-[1.015] opacity-45 blur-[1px]" : "opacity-100"
        }`}
      />
      {showOverlay && (
        <ImageLoadingOverlay
          label={isPendingUpload ? "Uploading image" : "Loading image"}
          showUploadIcon={isPendingUpload}
        />
      )}
    </NodeViewWrapper>
  );
};

export default CustomImageNodeView;
