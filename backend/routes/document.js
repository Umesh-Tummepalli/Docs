import express from 'express';
import {basicAuthorisation,documentAuthorisation} from "../middlewares/authorisation.js"
import { createDocument, getDocument, getDocumentAccess, getUsersDocuments, approveAccessRequest, denyAccessRequest } from '../controller/document.js';


const router = express.Router();

router.post('/new', basicAuthorisation, createDocument);

router.get('/:documentId', basicAuthorisation, documentAuthorisation, getDocument);

router.post('/:documentId/access-request', basicAuthorisation, getDocumentAccess);

router.post('/:documentId/access-request/approve', basicAuthorisation, approveAccessRequest);

router.post('/:documentId/access-request/deny', basicAuthorisation, denyAccessRequest);

router.get('/', basicAuthorisation, getUsersDocuments);

export default router;
