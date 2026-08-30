import mongoose from 'mongoose';
const documentAccessTokenSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  token: {
    type: String,
    required: true,
    unique: true,
  },
  documentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Document',
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  accessLevel: {
    type: String,
    enum: ['read', 'write'],
    required: true,
  },

},{timestamps: true});

export default mongoose.model('DocumentAccessToken', documentAccessTokenSchema);
