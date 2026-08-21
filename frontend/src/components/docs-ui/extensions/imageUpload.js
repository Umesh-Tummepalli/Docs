import axios from "axios";
import api from "@/lib/api";
import { addLocal } from "./imageStore";
import { onUploadFailure, onUploadSuccess } from "./imageUtils";

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
]);

export function validateImageFile(file) {
  if (!file || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Choose a JPG, PNG, GIF, or WEBP image";
  }
  if (file.size > 10 * 1024 * 1024) {
    return "Image size should be less than 10MB";
  }
  return null;
}

export function getClipboardImageFile(clipboardData) {
  const clipboardFiles = Array.from(clipboardData?.files || []);
  const directFile = clipboardFiles.find((file) => file.type.startsWith("image/"));
  if (directFile) return directFile;

  const clipboardItems = Array.from(clipboardData?.items || []);
  return clipboardItems
    .find((item) => item.kind === "file" && item.type.startsWith("image/"))
    ?.getAsFile() || null;
}

/**
 * Upload an image file and replace its temporary editor node with its
 * persistent DocumentAsset ID. Used by both the upload picker and paste.
 */
export async function uploadImageFile(editor, docId, file) {
  console.log(docId,file);
  const validationError = validateImageFile(file);
  if (validationError) throw new Error(validationError);
  if (!editor || !docId) throw new Error("The document is not ready for image uploads");

  const uploadId = crypto.randomUUID();
  const inserted = editor.chain().focus().insertPendingImage(uploadId).run();

  if (!inserted) {
    onUploadFailure(editor, uploadId);
    throw new Error("Could not insert the image into the document");
  }

  try {
    console.log("calling api for upload")
    const response = await api.get(`/documents/${docId}/image-upload-url`, {
      params: {
        fileName: file.name || "pasted-image.png",
        fileType: file.type,
      },
    });
    const { uploadUrl, assetId } = response.data;
    await axios.put(uploadUrl, file, {
      headers: { "Content-Type": file.type },
    });

    const completion = await api.post(
      `/documents/${docId}/assets/${assetId}/complete`
    );
    onUploadSuccess(editor, uploadId, assetId, completion.data.assetUrl);
  } catch (error) {
    onUploadFailure(editor, uploadId);
    throw error;
  }
}
