import cloudinary from "../config/cloudinary.js";
import dotenv from "dotenv";
dotenv.config();

export const getSignature = async (req, res) => {
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    const eager = "so_1,w_553,h_150,c_fill,f_jpg";

    // Parameters you want to enforce
    const paramsToSign = {
      timestamp: timestamp,
      eager: eager,
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
      eager,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to get signature" });
  }
};
