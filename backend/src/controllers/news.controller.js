import mongoose from "mongoose";
import { News } from "../models/News.js";
import { NewsComment } from "../models/NewsComment.js";
import { Author } from "../models/Authors.js";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
const createNews = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }

    const news = new News({ ...req.body });
    await news.save();

    res.status(201).json({ success: true, data: news });
  } catch (error) {
    console.log("News creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });

    const news = await News.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!news)
      return res.status(404).json({ success: false, message: "Invalid Id" });

    res
      .status(200)
      .json({ success: true, message: "News Update successful", data: news });
  } catch (error) {
    console.log("News Update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });

    const news = await News.findByIdAndDelete(id);

    if (!news)
      return res.status(404).json({ success: false, message: "Invalid Id" });

    res
      .status(200)
      .json({ success: true, message: "News Delete successful", data: news });
  } catch (error) {
    console.log("News delition failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getNewsBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug)
      return res.status(400).json({ success: false, message: "Invalid Slug" });

    const news = await News.findOne({ slug: slug, status: "published" })
      .populate("author", "name slug")
      .lean();

    if (!news)
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    const comments = await NewsComment.find({ newsId: news._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "News fetched successfully",
      data: { news, comments },
    });
  } catch (error) {
    console.log("News getting by slug failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllNews = async (req, res) => {
  try {
    const { title, search, author } = req.query;
    const page = Math.max(parseInt(req.query?.page || "1"), 1);
    const limit = Math.min(parseInt(req.query?.limit || "250"), 200);
    const skip = (page - 1) * limit;

    const filter = {};

    if (title) filter.title = req.query.title;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { content: { $regex: search, $options: "i" } },
        { tags: { $regex: search, $options: "i" } },
      ];
    }
    if (
      author &&
      author !== "undefined" &&
      author !== "null" &&
      author.trim() !== ""
    ) {
      const auth = await Author.findOne({ slug: author });
      if (!auth) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid author" });
      }
      filter.author = auth._id;
    }

    const total = await News.countDocuments(filter);
    const news = await News.find(filter)
      .select("title content coverImage slug excerpt updatedAt createdAt views")
      .populate("comments")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    res.status(200).json({
      success: true,
      message: "News fetch successfully",
      data: news,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("News getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const blogComment = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const { name, email, text, rating } = req.body;
    if (!name || !email || !text)
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    const blog = await Blog.findById(id);
    if (!blog)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    if (!rating) rating = 0;
    blog.comments.push({ name, email, text, rating });
    await blog.save();

    res
      .status(200)
      .json({ success: true, message: "Blog Comment successful", data: blog });
  } catch (error) {
    console.log("Blog creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const NewsView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const news = await News.findById(id);
    if (!news)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    const newNews = await News.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );

    res.status(200).json({ success: true, message: "News View successful" });
  } catch (error) {
    console.log("News View failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const NewsLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const news = await News.findById(id);
    if (!news)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    const newNews = await News.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true },
    );

    res
      .status(200)
      .json({ success: true, message: "News Like successful", data: newNews });
  } catch (error) {
    console.log("News likes failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const trandingNews = async (req, res) => {
  try {
    const news = await News.find().sort({ views: -1 }).limit(5).lean();
    res
      .status(200)
      .json({ success: true, message: "News fetch successfully", data: news });
  } catch (error) {
    console.log("Tranding News getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export {
  createNews,
  updateNews,
  deleteNews,
  getNewsBySlug,
  getAllNews,
  NewsView,
  trandingNews,
  NewsLike,
};
