import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    default : 'New Document'
  },
  content: {
    type: Object,
    default: {},
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  assetList: {
    type: [mongoose.Schema.Types.Mixed],
  },
  accessList: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
  accessRequests: {
    type: [mongoose.Schema.Types.ObjectId],
    default: [],
  },
},{ timestamps: true });

export default mongoose.model('Document', DocumentSchema);