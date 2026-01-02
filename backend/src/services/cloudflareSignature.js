import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
  forcePathStyle: true, // ✅ Important for R2
});

export const getPresignedUploadUrl = async (req, res) => {
  try {
    const { fileName, fileType, folder } = req.body;

    const key = `${folder}/${Date.now()}-${fileName}`;

    const command = new PutObjectCommand({
      Bucket: "musafirmedia",
      Key: key,
      ContentType: fileType,
    });

    // ✅ Sign without additional headers
    const uploadUrl = await getSignedUrl(s3, command, {
      expiresIn: 300,
      signableHeaders: new Set(["host"]), // Only sign the host header
    });

    res.json({
      uploadUrl,
      fileUrl: `https://cdn.musafirbaba.com/${key}`,
      key,
    });
  } catch (error) {
    console.error("Error generating presigned URL:", error);
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
};
