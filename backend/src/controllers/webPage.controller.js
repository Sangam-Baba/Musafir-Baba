import mongoose from "mongoose";
import { WebPage } from "../models/WebPage.js";

const createWebPage = async (req, res) => {
  try {
    const { title, slug, content } = req.body;
    if (!title || !slug || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }
    const webpage = new WebPage({ ...req.body });
    await webpage.save();
    res.status(201).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getWebPage = async (req, res) => {
  try {
    const { filter = {} } = req.query;
    if (req.query?.title) filter.title = req.query.title;
    if (req.query?.parent) filter.parent = req.query.parent;
    if (req.query?.status) filter.status = req.query.status;
    const webpage = await WebPage.find(filter).lean();
    res.status(200).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getWebPageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug)
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    const webpage = await WebPage.findOne({ slug }).lean();
    if (!webpage)
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    res.status(200).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage getting by slug failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getWebPageById = async (req, res) => {
  try {
    const { id } = req.params;
    console.log(id);
    if (!id)
      return res.status(404).json({ success: false, message: "Invalid id" });
    const webpage = await WebPage.findById({ _id: id }).lean();
    if (!webpage)
      return res.status(404).json({ success: false, message: "Invalid id" });
    res.status(200).json({ success: true, data: webpage });
  } catch (error) {
    console.log("WebPage getting by id failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateWebPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const webpage = await WebPage.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!webpage) {
      return res
        .status(404)
        .json({ success: false, message: "WebPage not found" });
    }
    res.status(200).json({
      success: true,
      message: "WebPage updated successfully",
      data: webpage,
    });
  } catch (error) {
    console.log("WebPage update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteWebPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const webpage = await WebPage.findByIdAndDelete(id);
    if (!webpage) {
      return res
        .status(404)
        .json({ success: false, message: "WebPage not found" });
    }
    res.status(200).json({
      success: true,
      message: "WebPage deleted successfully",
      data: webpage,
    });
  } catch (error) {
    console.log("WebPage delete failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getRelatedPages = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, message: "Page slug is required" });
    }

    const webpage = await WebPage.findOne({ slug: slug }).lean();
    if (!webpage) {
      return res
        .status(404)
        .json({ success: false, message: "Page not found" });
    }

    if (!webpage.keywords || webpage.keywords.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    const relatedPages = await WebPage.find({
      _id: { $ne: webpage._id },
      status: "published",
      keywords: { $in: webpage.keywords },
    })
      .limit(5)
      .select("title slug coverImage keywords excerpt createdAt")
      .lean();

    return res.status(200).json({ success: true, data: relatedPages });
  } catch (error) {
    console.error("Getting Related WebPages failed:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createWebPage,
  getWebPage,
  getWebPageBySlug,
  updateWebPage,
  deleteWebPage,
  getWebPageById,
  getRelatedPages,
};
