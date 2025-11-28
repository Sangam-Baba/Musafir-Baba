import { VideoBanner } from "../models/VideoBanner.js";

const createVideoBanner = async (req, res) => {
  try {
    const { media, link } = req.body;
    if (!media || !link) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }

    const videoBanner = new VideoBanner({ ...req.body });
    await videoBanner.save();
    res.status(201).json({
      success: true,
      message: "Video Banner created successfully",
      data: videoBanner,
    });
  } catch (error) {
    console.log("Video Banner creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateVideoBanner = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const videoBanner = await VideoBanner.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!videoBanner) {
      return res
        .status(404)
        .json({ success: false, message: "Video Banner not found" });
    }
    res.status(200).json({
      success: true,
      message: "Video Banner updated successfully",
      data: videoBanner,
    });
  } catch (error) {
    console.log("Video Banner update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteVideoBanner = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const videoBanner = await VideoBanner.findByIdAndDelete(id);
    if (!videoBanner) {
      return res
        .status(404)
        .json({ success: false, message: "Video Banner not found" });
    }
    res.status(200).json({
      success: true,
      message: "Video Banner deleted successfully",
      data: videoBanner,
    });
  } catch (error) {
    console.log("Video Banner delete failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllVideoBanner = async (req, res) => {
  try {
    const videoBanner = await VideoBanner.find({}).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      message: "Video Banner fetched successfully",
      data: videoBanner,
    });
  } catch (error) {
    console.log("Video Banner fetch failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getVideoBannerById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const videoBanner = await VideoBanner.findById(id);
    if (!videoBanner)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    res.status(200).json({
      success: true,
      message: "Video Banner fetched successfully",
      data: videoBanner,
    });
  } catch (error) {
    console.log("Video Banner getting by Id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createVideoBanner,
  updateVideoBanner,
  deleteVideoBanner,
  getAllVideoBanner,
  getVideoBannerById,
};
