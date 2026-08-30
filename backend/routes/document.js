import express from 'express';
import { basicAuthorisation, documentAccessAuthorisation, documentAuthorisation } from "../middlewares/authorisation.js";
import { createDocument, createDocumentAccessToken, deleteDocumentAccessToken, getDocument, getDocumentAccess, getDocumentAccessTokens, getUsersDocuments, approveAccessRequest, denyAccessRequest, grantOwnerAccess, removeDocumentUserAccess, updateDocumentTitle, updateDocumentUserAccess, saveDocument, getImageUploadUrl, completeImageUpload, getAssetUrl, giveDocumentAccess, deleteDocument, convertToPdf } from '../controller/document.js';


const router = express.Router();

router.post('/new', basicAuthorisation, createDocument);

router.get('/:documentId', documentAccessAuthorisation, getDocument);

router.get('/:documentId/collab-token', documentAccessAuthorisation, giveDocumentAccess);

router.post('/:documentId/access-token', basicAuthorisation, documentAuthorisation, createDocumentAccessToken);

router.get('/:documentId/access-tokens', basicAuthorisation, documentAuthorisation, getDocumentAccessTokens);

router.delete('/:documentId/access-tokens/:accessTokenId', basicAuthorisation, documentAuthorisation, deleteDocumentAccessToken);

router.post('/:documentId/access-request', basicAuthorisation, getDocumentAccess);

router.post('/:documentId/access-request/approve', basicAuthorisation, approveAccessRequest);

router.post('/:documentId/access-request/deny', basicAuthorisation, denyAccessRequest);

router.post('/:documentId/access/owner', basicAuthorisation, grantOwnerAccess);

router.patch('/:documentId/access/:userId', basicAuthorisation, updateDocumentUserAccess);

router.delete('/:documentId/access/:userId', basicAuthorisation, removeDocumentUserAccess);

router.patch('/:documentId/title', basicAuthorisation, updateDocumentTitle);

router.post('/:documentId/save', documentAccessAuthorisation, saveDocument);

router.get('/', basicAuthorisation, getUsersDocuments);

router.get('/:documentId/image-upload-url', documentAccessAuthorisation, getImageUploadUrl);

router.post('/:documentId/assets/:assetId/complete', documentAccessAuthorisation, completeImageUpload);

router.get('/:documentId/asseturl/:assetId', documentAccessAuthorisation, getAssetUrl);

router.delete('/:documentId', documentAccessAuthorisation, deleteDocument);


router.post("/:documentId/convert/pdf", documentAccessAuthorisation, convertToPdf);


export default router;
