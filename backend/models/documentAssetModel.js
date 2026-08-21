import mongoose from "mongoose";

const documentAssetSchema = new mongoose.Schema({
  documentId: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  contentType: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "ready"],
    default: "pending",
  },
}, { timestamps: true });

export default mongoose.model("DocumentAsset", documentAssetSchema);
