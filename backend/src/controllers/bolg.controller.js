import mongoose from "mongoose";
import { Blog } from "../models/Blog.js";
import { Comment } from "../models/Comment.js";
import { Category } from "../models/Category.js";
import { Author } from "../models/Authors.js";
const createBlog = async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res
        .status(400)
        .json({ success: false, message: "Required things missing" });
    }

    if (
      req.body.category &&
      !mongoose.Types.ObjectId.isValid(req.body.category)
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid category ID" });
    }
    const blog = new Blog({ ...req.body });
    await blog.save();

    res.status(201).json({ success: true, data: blog });
  } catch (error) {
    console.log("Blog creation failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateBlog = async (req, res) => {
  try {
    const { id } = req.params;
    const blog = await Blog.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!blog)
      return res.status(404).json({ success: false, message: "Invalid Id" });

    res
      .status(200)
      .json({ success: true, message: "Update successful", data: blog });
  } catch (error) {
    console.log("Blog Update failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const deleteBlog = async (req, res) => {
  try {
    const { id } = req.params;

    const blog = await Blog.findByIdAndDelete(id);

    if (!blog)
      return res.status(404).json({ success: false, message: "Invalid Id" });

    res
      .status(200)
      .json({ success: true, message: "Blog Delete successful", data: blog });
  } catch (error) {
    console.log("Blog delition failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getBlogBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const blog = await Blog.findOne({ slug: slug })
      .populate("category", "name slug")
      .populate("author", "name slug")
      .lean();

    if (!blog)
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    const comments = await Comment.find({ blogId: blog._id })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Blog fetched successfully",
      data: { blog, comments },
    });
  } catch (error) {
    console.log("Blog getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllBlog = async (req, res) => {
  try {
    const { title, search, category, author } = req.query;
    const page = Math.max(parseInt(req.query?.page || "1"), 1);
    const limit = Math.min(parseInt(req.query?.limit || "250"), 250);
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
      category &&
      category !== "undefined" &&
      category !== "null" &&
      category.trim() !== ""
    ) {
      console.log(category);
      const cat = await Category.findOne({ slug: category });
      if (!cat) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid category" });
      }
      //   console.log(cat);
      filter.category = cat._id.toString();
      //   filter.category = category;
      //   console.log("Filter is: ", filter);
    }
    if (
      author &&
      author !== "undefined" &&
      author !== "null" &&
      author.trim() !== ""
    ) {
      const aut = await Author.findOne({ slug: author });
      if (!aut) {
        return res
          .status(404)
          .json({ success: false, message: "Invalid author" });
      }
      filter.author = aut._id.toString();
    }

    const total = await Blog.countDocuments(filter);
    const blogs = await Blog.find(filter)
      .select("title content coverImage slug excerpt updatedAt createdAt")
      .populate("comments")
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(skip)
      .lean();

    res.status(200).json({
      success: true,
      message: "Blogs fetch successfully",
      data: blogs,
      total,
      page,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("Blog getting failed", error.message);
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

const blogView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res.status(400).json({ success: false, message: "Invalid Id" });
    const blog = await Blog.findById(id);
    if (!blog)
      return res.status(404).json({ success: false, message: "Invalid Id" });
    const newBlog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { views: 1 } },
      { new: true },
    );

    res.status(200).json({ success: true, message: "Blog View successful" });
  } catch (error) {
    console.log("Blog View failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
const blogLike = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "Invalid Blog Id" });

    console.log(id);
    const blog = await Blog.findById(id);
    if (!blog)
      return res
        .status(404)
        .json({ success: false, message: "Invalid Blogs Id" });
    const newBlog = await Blog.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true },
    );

    res
      .status(200)
      .json({ success: true, message: "Blog Like successful", data: newBlog });
  } catch (error) {
    console.log("Blog likes failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const trandingBlogs = async (req, res) => {
  try {
    const bolgs = await Blog.find({ status: "published" })
      .sort({ views: -1 })
      .limit(5)
      .lean();
    res.status(200).json({
      success: true,
      message: "Blogs fetch successfully",
      data: bolgs,
    });
  } catch (error) {
    console.log("Tranding Blog getting failed", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
export {
  createBlog,
  updateBlog,
  deleteBlog,
  getBlogBySlug,
  getAllBlog,
  blogComment,
  blogView,
  trandingBlogs,
  blogLike,
};
