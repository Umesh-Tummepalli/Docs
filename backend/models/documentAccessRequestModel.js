import mongoose from 'mongoose';


//any user requesting for access to any document
const DocumentAccessRequestSchema = new mongoose.Schema({
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessLevel: {
    type: String,
    enum: ['read', 'write'],
  },
});

export default mongoose.model('DocumentAccessRequest', DocumentAccessRequestSchema);
