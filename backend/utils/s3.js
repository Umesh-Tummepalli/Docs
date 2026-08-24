import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export const generateUploadUrl = async (docId, fileType, fileName) => {
  const key = `documents/${docId}/${crypto.randomUUID()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
    ContentType: fileType,
  });

  const uploadUrl = await getSignedUrl(s3, command, {
    expiresIn: 300, // 5 minutes
  });

  return {
    uploadUrl,
    key,
  };
};

export const generateAccessUrl = async (key) => {
  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  const accessUrl = await getSignedUrl(s3, command, {
    expiresIn: 60*60*10 , // 10 hours
  });

  return accessUrl;
};

export const getObjectMetadata = async (key) => {
  const command = new HeadObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET,
    Key: key,
  });

  return s3.send(command);
};
export default s3;

