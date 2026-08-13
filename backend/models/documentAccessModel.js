import mongoose from "mongoose";

// access level of a user for a document
const DocumentAccessSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Document",
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  accessLevel: {
    type: String,
    enum: ["read", "write", "owner" ],
    required: true
  },

});

export default mongoose.model("DocumentAccess", DocumentAccessSchema);
