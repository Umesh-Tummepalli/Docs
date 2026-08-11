import express from 'express';
import {basicAuthorisation,documentAuthorisation} from "../middlewares/authorisation.js"
import Document from "../models/DocumentModel.js"


const router = express.Router();
router.post('/new', basicAuthorisation, async (req, res) => {
  const {id} = req.user;
  const document = new Document({
    ownerId: id,
  });
  const savedDocument = await document.save();
  res.status(201).json({ message: 'Document created successfully', documentId: savedDocument._id, success: true });
});

router.get('/:documentId', documentAuthorisation, async (req, res) => {
  try {
    const {id} = req.user;
    const {documentId} = req.params;
    const document = await Document.findOne({ _id: documentId }, { accessRequests: 0, assetList: 0 });
    const editaccess = document.ownerId === id || document.accessList.some(access => access.userId === id && access.access === 'edit');
    
    res.status(200).json({
      document: {
        ownerId: document.ownerId,
        content: document.content,
        accessList: document.accessList,
        editaccess: editaccess
      }, success: true
    });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
  }
});

router.get('/', basicAuthorisation, async (req, res) => {
  try {
    const {id} = req.user;
    const documents = await Document.find({ ownerId: id }, { accessRequests: 0, assetList: 0 });
    res.status(200).json({ documents, success: true });
  } catch (error) {
    res.status(500).json({ message: 'Internal server error', success: false });
  }
});
export default router;
