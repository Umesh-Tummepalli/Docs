import redis from "../config/redis.js"
import mongoose from "mongoose";
import documentAccessModel from "../models/documentAccessModel.js";
import DocumentAccessToken from "../models/documentAccessToken.js";

const isProd = process.env.NODE_ENV === "production";

const clearSessionCookie = (res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    partitioned: isProd,
    path: "/",
  });
};

const loadSessionUser = async (req, res) => {
  const token = req?.cookies?.token;
  if (!token) return null;

  const sessionData = await redis.get(`session:${token}`);
  if (!sessionData) {
    clearSessionCookie(res);
    return null;
  }

  try {
    const session = JSON.parse(sessionData);
    const expiresAt = new Date(session.expiresAt).getTime();
    if (!session.id || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      await redis.del(`session:${token}`);
      clearSessionCookie(res);
      return null;
    }

    return { ...session, id: new mongoose.Types.ObjectId(session.id) };
  } catch {
    await redis.del(`session:${token}`);
    clearSessionCookie(res);
    return null;
  }
};

export const basicAuthorisation = async (req, res, next) => {
  try {
    const user = await loadSessionUser(req, res);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    req.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
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
    try {
      const user = await loadSessionUser(req, res);
      if (user) req.user = user;
      return documentAuthorisation(req, res, next);
    } catch (error) {
      return next(error);
    }
  }

  return basicAuthorisation(req, res, (error) => {
    if (error) return next(error);
    return documentAuthorisation(req, res, next);
  });
};
