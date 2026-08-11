import redis from "../config/redis.js"
import Document  from "../models/DocumentModel.js";

export const basicAuthorisation = async (req, res, next) => {
  const token = req?.cookies?.token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const sessionData = await redis.get(`session:${token}`);
  if (!sessionData) {
    res.clearCookie('token');
    return res.status(401).json({ message: "Unauthorized" });
  }
  req.user = JSON.parse(sessionData);
  next();
};

export const documentAuthorisation = async (req, res, next) => {
  const { id } = req.user;
  const { documentId } = req.params;
  const { accessList, ownerId } = await Document.findById(documentId,{ accessList: 1, ownerId: 1 });
  if (ownerId !== id && !accessList.includes(id)) {
    return res.status(403).json({ message: "Forbidden" });
  }
  
  next();
};


// ToDo : Microsoft oAuth2
