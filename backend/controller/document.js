import Document from "../models/documentModel.js"
import DocumentAccess from "../models/documentAccessModel.js"
import DocumentAccessRequest from "../models/documentAccessRequestModel.js"
import DocumentAsset from "../models/documentAssetModel.js"

import * as Y from 'yjs';
import { generateAccessUrl, generateUploadUrl, getObjectMetadata } from "../utils/s3.js";
import redis from "../config/redis.js"
import jwt from "jsonwebtoken"


const canEdit = (accessLevel) => ["owner", "write"].includes(accessLevel);
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
export const createDocument = async (req, res) => {
  try {
    const { id } = req.user;

    const documentTitle = 'Untitled Document';

    const yDoc = new Y.Doc();
    yDoc.getMap('metadata');

    const ydocbinary = Y.encodeStateAsUpdate(yDoc); // unint8array
    const document = new Document({
      ownerId: id,
      title: documentTitle,
      content: Buffer.from(ydocbinary),
      assetList: [],
    });

    const savedDocument = await document.save();

    const documentAccess = new DocumentAccess({
      documentId: savedDocument._id,
      userId: id,
      accessLevel: 'owner',
    });
    await documentAccess.save();

    res.status(201).json({
      message: 'Document created successfully',
      documentId: savedDocument._id,
      success: true,
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to create document',
      error: error.message,
      success: false,
    });
  }
};

export const getDocument = async (req, res) => {
  try {
    const {id} = req.user;
    const {documentId} = req.params;
    const document = await Document.findOne({ _id: documentId }, { assetList: 0 });
    if(!document) return res.status(404).json({ message: 'Document not found', success: false });
    const accessList = await DocumentAccess.find({ documentId }).populate('userId', 'username email');
    const accessRequests = await DocumentAccessRequest.find({ documentId }).populate('userId', 'username email');
    const ydocbuffer = document.content;
    res.status(200).json({
      document: {
        ownerId: document.ownerId,
        content: Array.from(ydocbuffer),
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

export const giveDocumentAccess = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { id, accessLevel } = req.user;

    const payload = {
      docId: documentId,
      userId: id,
      accessLevel,
    }
    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.status(200).json({ token, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
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
    console.error("error from denyAccessRequest document.js",error);
  }
};

export const saveDocument = async (req, res) => {
  try {
    if (!canEdit(req.user.accessLevel)) {
      return res.status(403).json({ message: 'Write access is required', success: false });
    }
    const { documentId } = req.params;
    const yjsbuffer = req.body;
    const uint8array = new Uint8Array(yjsbuffer);
    const doc = await Document.findById(documentId);
    if (!doc) {
      return res.status(404).json({ message: 'Document not found', success: false });
    }
    doc.content = Buffer.from(uint8array);
    await doc.save();
    res.status(200).json({ message: 'Document saved successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error("error from savedDocument document.js",error);
  }
};

export const imageHandler = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;
    
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error("error from imageHandler document.js",error);
  }
};

export const getImageUploadUrl = async (req, res) => {
  try {
    if (!canEdit(req.user.accessLevel)) {
      return res.status(403).json({ message: 'Write access is required', success: false });
    }

    const { documentId } = req.params;
    // This endpoint is a GET, so the client sends its metadata as query params.
    const { fileType, fileName } = req.query;

    if (typeof fileType !== 'string' || !ALLOWED_IMAGE_TYPES.has(fileType)) {
      return res.status(400).json({ message: 'A valid image type is required', success: false });
    }
    if (typeof fileName !== 'string' || !fileName.trim()) {
      return res.status(400).json({ message: 'A file name is required', success: false });
    }

    const uploadUrl = await generateUploadUrl(documentId, fileType, fileName);
    const documentAsset = new DocumentAsset({
      documentId,
      key: uploadUrl.key,
      contentType: fileType,
    });
    await documentAsset.save();
    res.status(200).json({ uploadUrl: uploadUrl.uploadUrl, assetId: documentAsset._id, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error("error from getImageUploadUrl document.js",error);
  }
};

export const completeImageUpload = async (req, res) => {
  try {
    if (!canEdit(req.user.accessLevel)) {
      return res.status(403).json({ message: 'Write access is required', success: false });
    }

    const { documentId, assetId } = req.params;
    const asset = await DocumentAsset.findOne({ _id: assetId, documentId });
    if (!asset) {
      return res.status(404).json({ message: 'Image asset not found', success: false });
    }

    const object = await getObjectMetadata(asset.key);
    if (!ALLOWED_IMAGE_TYPES.has(object.ContentType)) {
      return res.status(400).json({ message: 'Uploaded file is not an image', success: false });
    }
    if (object.ContentLength > MAX_IMAGE_SIZE_BYTES) {
      return res.status(400).json({ message: 'Image size must be 10MB or less', success: false });
    }

    asset.status = 'ready';
    await asset.save();

    const assetUrl = await generateAccessUrl(asset.key);
    return res.status(200).json({ assetUrl, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Unable to complete image upload', success: false });
    console.error('error from completeImageUpload document.js', error);
  }
};

export const getAssetUrl = async (req, res) => {
  try {
    const { id } = req.user;
    const { assetId } = req.params;
    // Assets created before the status field was introduced are already live.
    const asset = await DocumentAsset.findOne({ _id: assetId, status: { $ne: 'pending' } });
    if (!asset) {
      return res.status(404).json({ message: 'Image asset not found', success: false });
    }

    // const access = await DocumentAccess.findOne({ documentId: asset.documentId, userId: id });
    // if (!access) {
    //   return res.status(403).json({ message: 'Forbidden', success: false });
    // }

    const cachedUrl = await redis.get(`assetURL:${assetId}`);
    if (cachedUrl) {
      return res.status(200).json({ url: cachedUrl, success: true });
    }

    const accessUrl = await generateAccessUrl(asset.key);
    await redis.set(`assetURL:${assetId}`, accessUrl, 'EX', 60 * 60 * 10);
    if (!accessUrl) throw new Error('Failed to generate access URL');
    res.status(200).json({ url: accessUrl, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error("error from getAssetUrl document.js", error);
  }
};
