import redis from "../config/redis.js"
import mongoose from "mongoose";
import documentAccessModel from "../models/documentAccessModel.js";
import DocumentAccessToken from "../models/documentAccessToken.js";

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
  try {
    const { documentId } = req.params;
    const token = req.query.access;

    if (req.user?.id) {
      const userAccess = await documentAccessModel.findOne({ documentId, userId: req.user.id });
      if (userAccess) {
        req.user.accessLevel = userAccess.accessLevel;
        return next();
      }
    }

    if (typeof token === "string" && token) {
      const accessToken = await DocumentAccessToken.findOne({ token, documentId });
      if (!accessToken) {
        return res.status(403).json({ message: "Invalid document access token" });
      }

      req.user = {
        ...(req.user ?? {}),
        accessLevel: accessToken.accessLevel,
        accessToken: true,
      };
      return next();
    }

    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const doc = await documentAccessModel.findOne({ documentId });
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    return res.status(403).json({ message: "Forbidden" });
  } catch (error) {
    next(error);
  }
};

export const documentAccessAuthorisation = async (req, res, next) => {
  if (typeof req.query.access === "string" && req.query.access) {
    const sessionToken = req?.cookies?.token;
    if (sessionToken) {
      const sessionData = await redis.get(`session:${sessionToken}`);
      if (sessionData) {
        const user = JSON.parse(sessionData);
        req.user = { ...user, id: new mongoose.Types.ObjectId(user.id) };
      }
    }

    return documentAuthorisation(req, res, next);
  }

  return basicAuthorisation(req, res, (error) => {
    if (error) return next(error);
    return documentAuthorisation(req, res, next);
  });
};
