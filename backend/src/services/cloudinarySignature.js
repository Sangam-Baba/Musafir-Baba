import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";
dotenv.config();


export const getSignature = async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);

    // Parameters you want to enforce
    const paramsToSign = {
      timestamp: timestamp,
    //   folder: "blogs", // optional: group uploads in a folder
    };

    // Create signature
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    res.json({
      signature,
      timestamp,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get signature" });
  }
};
