import { useState, useRef, useEffect, useCallback } from "react";
import { useEditorState } from "@tiptap/react";
import { useEditorContext } from "../context/EditorContext";
import { 
  ImageIcon, 
  Upload, 
  Link, 
  X, 
  Check, 
  AlertCircle, 
  FileImage,
  Loader2,
  ExternalLink,
  ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import ToolbarButton from "./ToolbarButton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ImageButton = () => {
  const editor = useEditorContext();

  const [panelOpen, setPanelOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [mode, setMode] = useState("upload");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);

  const wrapperRef = useRef(null);
  const urlInputRef = useRef(null);

  const { isImageActive } = useEditorState({
    editor,
    selector: ({ editor: currentEditor }) => ({
      isImageActive: currentEditor?.isActive("image"),
    }),
  });

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setPanelOpen(false);
        handleReset();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus URL input when mode changes to URL
  useEffect(() => {
    if (panelOpen && mode === "url" && urlInputRef.current) {
      setTimeout(() => urlInputRef.current?.focus(), 200);
    }
  }, [mode, panelOpen]);

  // Reset states
  const handleReset = useCallback(() => {
    setImageUrl("");
    setError("");
    setIsUploading(false);
    setDragOver(false);
    setPreviewUrl(null);
  }, []);

  // Validate image URL
  const validateImageUrl = (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  // Handle file upload with drag and drop
  const handleFileUpload = useCallback((file) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please select an image file");
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size should be less than 10MB");
      return;
    }

    setError("");
    setIsUploading(true);

    // Show preview
    const previewReader = new FileReader();
    previewReader.onload = (e) => setPreviewUrl(e.target?.result);
    previewReader.readAsDataURL(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result;
      if (result) {
        editor?.chain().focus().setImage({ src: result }).run();
        setTimeout(() => {
          setPanelOpen(false);
          handleReset();
        }, 300);
      }
      setIsUploading(false);
    };

    reader.onerror = () => {
      setError("Failed to upload image. Please try again.");
      setIsUploading(false);
      setPreviewUrl(null);
    };

    reader.readAsDataURL(file);
  }, [editor, handleReset]);

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  // Handle URL submission with validation
  const handleUrlSubmit = () => {
    const trimmedUrl = imageUrl.trim();
    
    if (!trimmedUrl) {
      setError("Please enter an image URL");
      return;
    }

    if (!validateImageUrl(trimmedUrl)) {
      setError("Please enter a valid URL (http:// or https://)");
      return;
    }

    setError("");
    editor?.chain().focus().setImage({ src: trimmedUrl }).run();
    
    setTimeout(() => {
      setPanelOpen(false);
      handleReset();
    }, 300);
  };

  // URL input change handler
  const handleUrlChange = (e) => {
    setImageUrl(e.target.value);
    if (error) setError("");
  };

  return (
    <div ref={wrapperRef} className="relative flex items-center">
      <ToolbarButton
        Icon={ImageIcon}
        label="Image"
        isActive={isImageActive || panelOpen}
        onClick={(e) => {
          e.preventDefault();
          setPanelOpen(!panelOpen);
          if (!panelOpen) handleReset();
        }}
      />

      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-0 top-full z-50 mt-2 w-[360px] rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden"
          >

            {/* Mode Switcher */}
            <div className="p-2 mx-4 mt-4 mb-2 bg-gray-100 rounded-lg flex gap-1">
              <button
                onClick={() => {
                  setMode("upload");
                  handleReset();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === "upload"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>

              <button
                onClick={() => {
                  setMode("url");
                  handleReset();
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all duration-200 ${
                  mode === "url"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                <Link className="h-4 w-4" />
                URL
              </button>
            </div>

            {/* Content */}
            <div className="p-5 pt-3">
              <AnimatePresence mode="wait">
                {mode === "upload" ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {previewUrl && !isUploading ? (
                      <div className="relative rounded-xl overflow-hidden mb-3">
                        <img 
                          src={previewUrl} 
                          alt="Preview" 
                          className="w-full h-40 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <Check className="h-8 w-8 text-white" />
                        </div>
                      </div>
                    ) : null}

                    <div
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-200 ${
                        dragOver
                          ? "border-blue-400 bg-blue-50 scale-[1.02]"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      } ${isUploading ? "opacity-50 pointer-events-none" : "cursor-pointer"}`}
                    >
                      {isUploading ? (
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                          <p className="text-sm font-medium text-gray-700">Uploading image...</p>
                          <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-1.5">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: "100%" }}
                              transition={{ duration: 1 }}
                              className="bg-blue-500 h-1.5 rounded-full"
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <motion.div
                            animate={dragOver ? { scale: 1.1, rotate: [0, -5, 5, 0] } : {}}
                            transition={{ duration: 0.3 }}
                            className="p-3 rounded-full bg-gray-100 mb-4"
                          >
                            <Upload className={`h-6 w-6 ${dragOver ? "text-blue-500" : "text-gray-600"}`} />
                          </motion.div>

                          <div className="text-center">
                            <p className="text-sm font-medium text-gray-900 mb-1">
                              {dragOver ? "Drop your image here" : "Click to upload"}
                            </p>
                            <p className="text-xs text-gray-500">
                              or drag and drop
                            </p>
                          </div>

                          <div className="flex gap-2 mt-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-xs text-gray-600">
                              <FileImage className="h-3 w-3" />
                              JPG
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-xs text-gray-600">
                              <FileImage className="h-3 w-3" />
                              PNG
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-gray-100 text-xs text-gray-600">
                              <FileImage className="h-3 w-3" />
                              GIF
                            </span>
                          </div>
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                        onChange={handleFileInputChange}
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Image URL
                      </label>
                      <div className="relative">
                        <Input
                          ref={urlInputRef}
                          placeholder="https://example.com/image.jpg"
                          value={imageUrl}
                          onChange={handleUrlChange}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUrlSubmit();
                            }
                          }}
                          className={`pl-10 pr-4 h-11 text-sm rounded-lg ${
                            error
                              ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
                              : "border-gray-300 focus:ring-blue-500/20 focus:border-blue-500"
                          }`}
                          aria-invalid={!!error}
                        />
                        <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        
                        {imageUrl && !error && (
                          <button
                            onClick={() => setImageUrl("")}
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-100"
                          >
                            <X className="h-3.5 w-3.5 text-gray-400" />
                          </button>
                        )}
                      </div>

                      {error ? (
                        <motion.p
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="flex items-center gap-1.5 mt-2 text-xs text-red-500"
                        >
                          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
                          {error}
                        </motion.p>
                      ) : (
                        <p className="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
                          <ExternalLink className="h-3 w-3" />
                          Paste a link to an image from the web
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setPanelOpen(false);
                          handleReset();
                        }}
                        className="h-9 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleUrlSubmit}
                        disabled={!imageUrl.trim() || !!error}
                        className="h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Insert Image
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ImageButton;