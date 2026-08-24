import express from 'express';
import {basicAuthorisation,documentAuthorisation} from "../middlewares/authorisation.js"
import { createDocument, getDocument, getDocumentAccess, getUsersDocuments, approveAccessRequest, denyAccessRequest, saveDocument, getImageUploadUrl, completeImageUpload, getAssetUrl } from '../controller/document.js';


const router = express.Router();

router.post('/new', basicAuthorisation, createDocument);

router.get('/:documentId', basicAuthorisation, documentAuthorisation, getDocument);

router.post('/:documentId/access-request', basicAuthorisation, getDocumentAccess);

router.post('/:documentId/access-request/approve', basicAuthorisation, approveAccessRequest);

router.post('/:documentId/access-request/deny', basicAuthorisation, denyAccessRequest);

router.post('/:documentId/save', basicAuthorisation, documentAuthorisation, saveDocument);

router.get('/', basicAuthorisation, getUsersDocuments);

router.get('/:documentId/image-upload-url', basicAuthorisation, documentAuthorisation, getImageUploadUrl);

router.post('/:documentId/assets/:assetId/complete', basicAuthorisation, documentAuthorisation, completeImageUpload);

router.get('/asseturl/:assetId', basicAuthorisation, documentAuthorisation, getAssetUrl);

export default router;
