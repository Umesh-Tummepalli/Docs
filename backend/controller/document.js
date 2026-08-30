import redis from "../config/redis.js"
import jwt from "jsonwebtoken"
import crypto from "crypto";
import puppeteer from "puppeteer";
import * as Y from 'yjs';


import Document from "../models/documentModel.js"
import DocumentAccess from "../models/documentAccessModel.js"
import DocumentAccessRequest from "../models/documentAccessRequestModel.js"
import DocumentAccessToken from "../models/documentAccessToken.js"
import DocumentAsset from "../models/documentAssetModel.js"

import { generateAccessUrl, generateUploadUrl, getObjectMetadata, deleteObject } from "../utils/s3.js";


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
    const {documentId} = req.params;
    const document = await Document.findOne({ _id: documentId }, { assetList: 0 });
    if(!document) return res.status(404).json({ message: 'Document not found', success: false });
    const isOwner = req.user.accessLevel === 'owner';
    const accessList = isOwner
      ? await DocumentAccess.find({ documentId }).populate('userId', 'username email')
      : [];
    const accessRequests = isOwner
      ? await DocumentAccessRequest.find({ documentId }).populate('userId', 'username email')
      : [];
    const ydocbuffer = document.content;
    res.status(200).json({
      document: {
        title: document.title,
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

export const createDocumentAccessToken = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { id } = req.user;
    const name = req.body?.name?.trim();
    const { accessLevel } = req.body ?? {};

    if (!name) {
      return res.status(400).json({ message: 'Token name is required', success: false });
    }
    if (!['read', 'write'].includes(accessLevel)) {
      return res.status(400).json({ message: 'Access level must be read or write', success: false });
    }

    const ownerAccess = await DocumentAccess.findOne({
      documentId,
      userId: id,
      accessLevel: 'owner',
    });
    if (!ownerAccess) {
      return res.status(403).json({ message: 'Only document owners can create access tokens', success: false });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const accessToken = await DocumentAccessToken.create({
      name,
      token,
      documentId,
      createdBy: id,
      accessLevel,
    });

    return res.status(201).json({
      message: 'Document access token created successfully',
      token: accessToken.token,
      name: accessToken.name,
      accessLevel: accessToken.accessLevel,
      success: true,
    });
  } catch (error) {
    console.error('error from createDocumentAccessToken document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const getDocumentAccessTokens = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { id } = req.user;

    const ownerAccess = await DocumentAccess.findOne({
      documentId,
      userId: id,
      accessLevel: 'owner',
    });
    if (!ownerAccess) {
      return res.status(403).json({ message: 'Only document owners can view access tokens', success: false });
    }

    const tokens = await DocumentAccessToken
      .find({ documentId })
      .select('name token createdBy accessLevel createdAt updatedAt')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    return res.status(200).json({ tokens, success: true });
  } catch (error) {
    console.error('error from getDocumentAccessTokens document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const deleteDocumentAccessToken = async (req, res) => {
  try {
    const { documentId, accessTokenId } = req.params;
    const { id } = req.user;

    const ownerAccess = await DocumentAccess.findOne({
      documentId,
      userId: id,
      accessLevel: 'owner',
    });
    if (!ownerAccess) {
      return res.status(403).json({ message: 'Only document owners can delete access tokens', success: false });
    }

    const deletedToken = await DocumentAccessToken.findOneAndDelete({
      _id: accessTokenId,
      documentId,
    });
    if (!deletedToken) {
      return res.status(404).json({ message: 'Access token not found', success: false });
    }

    return res.status(200).json({ message: 'Document access token deleted successfully', success: true });
  } catch (error) {
    console.error('error from deleteDocumentAccessToken document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
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
    const accessRecords = await DocumentAccess
      .find({ userId: id })
      .populate('documentId', 'title updatedAt')
      .lean();

    const documents = { owner: [], write: [], read: [] };
    accessRecords.forEach((access) => {
      if (!access.documentId || !documents[access.accessLevel]) return;
      documents[access.accessLevel].push({
        documentId: access.documentId._id,
        title: access.documentId.title,
        lastModified: access.documentId.updatedAt,
        accessLevel: access.accessLevel,
      });
    });

    Object.values(documents).forEach((list) => {
      list.sort((first, second) => new Date(second.lastModified) - new Date(first.lastModified));
    });

    res.status(200).json({ documents, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const getDocumentAccess = async (req, res) => {
  try {
    const {id} = req.user;
    const { documentId } = req.params;
    const accessLevel = req.body?.accessLevel || req.query?.accessLevel;
    if (!accessLevel) {
      return res.status(400).json({ message: 'Access level is required', success: false });
    }
    if (!['read', 'write'].includes(accessLevel)) {
      return res.status(400).json({ message: 'Invalid access level', success: false });
    }

    const document = await Document.findById(documentId).select('_id');
    if (!document) {
      return res.status(404).json({ message: 'Document not found', success: false });
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
      if (existingRequest.accessLevel === accessLevel) {
        return res.status(200).json({ message: 'Access request is already pending', success: true });
      }

      existingRequest.accessLevel = accessLevel;
      await existingRequest.save();
      return res.status(200).json({ message: 'Access request updated successfully', success: true });
    }

    await DocumentAccessRequest.create({ documentId, userId: id, accessLevel });
    return res.status(201).json({ message: 'Access request created successfully', success: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Access request is already pending', success: true });
    }

    res.status(500).json({ message: 'Internal server error', success: false });
    console.error(error);
  }
};

export const approveAccessRequest = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;
    const { requestId, accessLevel } = req.body;

    const access = await DocumentAccess.findOne({ documentId, userId: id });
    if (!access || access.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Forbidden', success: false });
    }

    const request = await DocumentAccessRequest.findOne({ _id: requestId, documentId });
    if (!request) {
      return res.status(404).json({ message: 'Request not found', success: false });
    }

    const grantedAccessLevel = accessLevel || request.accessLevel;
    if (!['read', 'write', 'owner'].includes(grantedAccessLevel)) {
      return res.status(400).json({ message: 'Invalid access level', success: false });
    }

    await DocumentAccess.findOneAndUpdate(
      { documentId, userId: request.userId },
      { $set: { accessLevel: grantedAccessLevel } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await DocumentAccessRequest.deleteOne({ _id: requestId, documentId });

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

    const deleted = await DocumentAccessRequest.findOneAndDelete({ _id: requestId, documentId });
    if (!deleted) {
      return res.status(404).json({ message: 'Request not found', success: false });
    }

    res.status(200).json({ message: 'Request denied successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error("error from denyAccessRequest document.js",error);
  }
};

export const grantOwnerAccess = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required', success: false });
    }

    const requesterAccess = await DocumentAccess.findOne({ documentId, userId: id });
    if (!requesterAccess || requesterAccess.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Only document owners can grant ownership', success: false });
    }

    const recipientAccess = await DocumentAccess.findOne({ documentId, userId });
    if (!recipientAccess) {
      return res.status(404).json({ message: 'User does not have document access', success: false });
    }

    recipientAccess.accessLevel = 'owner';
    await recipientAccess.save();

    return res.status(200).json({ message: 'Owner access granted successfully', success: true });
  } catch (error) {
    console.error('error from grantOwnerAccess document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const updateDocumentUserAccess = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId, userId } = req.params;
    const { accessLevel } = req.body;

    if (!['read', 'write', 'owner'].includes(accessLevel)) {
      return res.status(400).json({ message: 'Invalid access level', success: false });
    }

    const requesterAccess = await DocumentAccess.findOne({ documentId, userId: id });
    if (!requesterAccess || requesterAccess.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Only document owners can change access', success: false });
    }

    const targetAccess = await DocumentAccess.findOne({ documentId, userId });
    if (!targetAccess) {
      return res.status(404).json({ message: 'User does not have document access', success: false });
    }
    if (targetAccess.accessLevel === 'owner' && accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Owner access cannot be downgraded', success: false });
    }

    targetAccess.accessLevel = accessLevel;
    await targetAccess.save();

    return res.status(200).json({
      message: 'Document access updated successfully',
      accessLevel: targetAccess.accessLevel,
      success: true,
    });
  } catch (error) {
    console.error('error from updateDocumentUserAccess document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const removeDocumentUserAccess = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId, userId } = req.params;

    const requesterAccess = await DocumentAccess.findOne({ documentId, userId: id });
    if (!requesterAccess || requesterAccess.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Only document owners can remove access', success: false });
    }

    const targetAccess = await DocumentAccess.findOne({ documentId, userId });
    if (!targetAccess) {
      return res.status(404).json({ message: 'User does not have document access', success: false });
    }
    if (targetAccess.accessLevel === 'owner') {
      return res.status(403).json({ message: 'Owner access cannot be removed', success: false });
    }

    await targetAccess.deleteOne();
    return res.status(200).json({ message: 'Document access removed successfully', success: true });
  } catch (error) {
    console.error('error from removeDocumentUserAccess document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
  }
};

export const updateDocumentTitle = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;
    const title = req.body?.title?.trim();

    if (!title) {
      return res.status(400).json({ message: 'Document title is required', success: false });
    }
    if (title.length > 200) {
      return res.status(400).json({ message: 'Document title must be 200 characters or fewer', success: false });
    }

    const ownerAccess = await DocumentAccess.findOne({ documentId, userId: id, accessLevel: 'owner' });
    if (!ownerAccess) {
      return res.status(403).json({ message: 'Only document owners can rename this document', success: false });
    }

    const document = await Document.findByIdAndUpdate(
      documentId,
      { $set: { title } },
      { new: true, runValidators: true }
    );
    if (!document) {
      return res.status(404).json({ message: 'Document not found', success: false });
    }

    return res.status(200).json({ message: 'Document title updated', title: document.title, success: true });
  } catch (error) {
    console.error('error from updateDocumentTitle document.js', error);
    return res.status(500).json({ message: 'Internal server error', success: false });
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

export const deleteDocument = async (req, res) => {
  try {
    const { id } = req.user;
    const { documentId } = req.params;

    // Verify the requester is the document owner.
    const access = await DocumentAccess.findOne({ documentId, userId: id });
    if (!access || access.accessLevel !== 'owner') {
      return res.status(403).json({ message: 'Only the document owner can delete this document', success: false });
    }

    const document = await Document.findById(documentId);
    if (!document) {
      return res.status(404).json({ message: 'Document not found', success: false });
    }

    // Delete all S3 objects for this document's assets, then the DB records.
    const assets = await DocumentAsset.find({ documentId });
    await Promise.allSettled(
      assets.map((asset) => deleteObject(asset.key))
    );
    await DocumentAsset.deleteMany({ documentId });

    // Delete access records, access requests, and the document itself.
    await DocumentAccess.deleteMany({ documentId });
    await DocumentAccessRequest.deleteMany({ documentId });
    await Document.findByIdAndDelete(documentId);

    return res.status(200).json({ message: 'Document deleted successfully', success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
    console.error('error from deleteDocument document.js', error);
  }
};

export const convertToPdf = async (req, res) => {
  const { html } = req.body;

  if (!html || typeof html !== "string") {
    return res.status(400).json({
      message: "html is required and must be a string",
    });
  }

  let browser;

  try {
    browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'inline; filename="document.pdf"');
    res.setHeader("Content-Length", pdf.length);

    res.end(pdf);
  } catch (error) {
    console.error("PDF generation failed:", error);

    if (!res.headersSent) {
      res.status(500).json({
        message: "Failed to generate PDF",
      });
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
