import { Media } from "../models/Media.js";

const createMedia = async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const media = new Media({ ...req.body });
    await media.save();
    res.status(201).json({ success: true, data: media });
  } catch (error) {
    console.log("Media creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllMedia = async (req, res) => {
  try {
    const allMedia = await Media.find().sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data: allMedia });
  } catch (error) {
    console.log("All Media getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export { createMedia, getAllMedia };
