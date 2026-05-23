import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: true,
});

export const uploadToCloudinary = (fileBuffer, folder = "uploads") => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" }, // auto = handles images, videos, pdfs etc.
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

export const uploadToR2 = async (fileBuffer, folder = "uploads", mimeType = "image/jpeg") => {
  const key = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  
  const command = new PutObjectCommand({
    Bucket: "musafirmedia",
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
  });

  await s3.send(command);
  return `https://cdn.musafirbaba.com/${key}`;
};
