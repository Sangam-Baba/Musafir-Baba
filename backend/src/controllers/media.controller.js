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

const updateMedia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const media = await Media.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res
      .status(200)
      .json({ success: true, message: "Update successful", data: media });
  } catch (error) {
    console.log("Media update failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const media = await Media.findById(id).lean();
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res.status(200).json({ success: true, data: media });
  } catch (error) {
    console.log("Media getting by id failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const deleteMedia = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const media = await Media.findByIdAndDelete(id);
    if (!media) {
      return res.status(404).json({ success: false, message: "Invalid Id" });
    }
    res.status(200).json({
      success: true,
      message: "Media deleted successfully",
      data: media,
    });
  } catch (error) {
    console.log("Media delete failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
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

export { createMedia, getAllMedia, getMediaById, updateMedia, deleteMedia };
