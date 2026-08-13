import redis from "../config/redis.js"
import mongoose from "mongoose";
import documentAccessModel from "../models/documentAccessModel.js";

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
  req.user.id = new mongoose.Types.ObjectId(req.user.id);
  next();
};

export const documentAuthorisation = async (req, res, next) => {
  const { id } = req.user;
  const { documentId } = req.params;
  const doc = await documentAccessModel.findOne({ documentId});
  if (!doc) {
    return res.status(404).json({ message: "Document not found" });
  }
  
  const access = await documentAccessModel.findOne({ documentId, userId: id });
  if (!access) {
    return res.status(403).json({ message: "Forbidden" });
  }

  req.user.accessLevel = access.accessLevel;

  next();
};
