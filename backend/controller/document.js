import Document from "../models/documentModel.js"
import DocumentAccess from "../models/documentAccessModel.js"
import DocumentAccessRequest from "../models/documentAccessRequestModel.js"

export const createDocument = async (req, res) => {
  const {id} = req.user;
  const document = new Document({
    ownerId: id,
  });
  const savedDocument = await document.save();
  const documentAccess = new DocumentAccess({
    documentId: savedDocument._id,
    userId: id,
    accessLevel: 'owner',
  });
  await documentAccess.save();

  res.status(201).json({ message: 'Document created successfully', documentId: savedDocument._id, success: true });
};

export const getDocument = async (req, res) => {
  try {
    const {id} = req.user;
    const {documentId} = req.params;
    const document = await Document.findOne({ _id: documentId }, { assetList: 0 });
    const accessList = await DocumentAccess.find({ documentId }).populate('userId', 'username email');
    const accessRequests = await DocumentAccessRequest.find({ documentId }).populate('userId', 'username email');

    res.status(200).json({
      document: {
        title: document.title,
        ownerId: document.ownerId,
        content: document.content,
        accessList,
        accessRequests,
        accessLevel: req.user.accessLevel,
      }, success: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error(error);
  }
};

export const getUsersDocuments = async (req, res) => {
  try {
    const {id} = req.user;
    const documents = await Document.find({ ownerId: id }, { accessRequests: 0, assetList: 0, content:0 });
    res.status(200).json({ documents, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const getDocumentAccess = async (req, res) => {
  try {
    const {id} = req.user;
    const { documentId } = req.params;
    const { accessLevel } = req.query;
    if (!accessLevel) {
      return res.status(400).json({ message: 'Access level is required', success: false });
    }
    if (!['read', 'write'].includes(accessLevel)) {
      return res.status(400).json({ message: 'Invalid access level', success: false });
    }

    const docaccess = await DocumentAccess.findOne({ documentId, userId: id });

    if (docaccess?.accessLevel === 'owner' || docaccess?.accessLevel === accessLevel) {
      return res.status(200).json({ message: 'Access already exists', success: true });
    }

    if (docaccess?.accessLevel === 'write' && accessLevel === 'read') {
      return res.status(200).json({ message: 'Write access already includes read access', success: true });
    }

    const existingRequest = await DocumentAccessRequest.findOne({ documentId, userId: id });
    if (existingRequest) {
      existingRequest.accessLevel = accessLevel;
      await existingRequest.save();
    } else {
      await DocumentAccessRequest.create({ documentId, userId: id, accessLevel });
    }

    return res.status(201).json({ message: 'Access request created successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error(error);
  }
};

export const approveAccessRequest = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;
    const { requestId } = req.body;

    const access = await DocumentAccess.findOne({ documentId, userId: id });
    if (!access || access.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Forbidden', success: false });
    }

    const request = await DocumentAccessRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({ message: 'Request not found', success: false });
    }

    await DocumentAccess.create({
      documentId: request.documentId,
      userId: request.userId,
      accessLevel: request.accessLevel,
    });

    await DocumentAccessRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: 'Request approved successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error(error);
  }
};

export const denyAccessRequest = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;
    const { requestId } = req.body;

    const access = await DocumentAccess.findOne({ documentId, userId: id });
    if (!access || access.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Forbidden', success: false });
    }

    await DocumentAccessRequest.findByIdAndDelete(requestId);

    res.status(200).json({ message: 'Request denied successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error(error);
  }
};
