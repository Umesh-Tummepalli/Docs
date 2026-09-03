import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  title: {
    type: String,
    default : 'New Document'
  },
  content: {
    type: Buffer,
    default: Buffer.alloc(0),
  },

  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  assetList: {
    type: [mongoose.Schema.Types.Mixed],
  },
},{ timestamps: true });

export default mongoose.model('Document', DocumentSchema);
