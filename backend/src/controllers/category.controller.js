import { Category } from "../models/Category.js";
import mongoose from "mongoose";
import { Destination } from "../models/Destination.js";
const createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;

    const isExist = await Category.findOne({ name: name.trim() });
    if (isExist) {
      return res.status(400).json({
        success: false,
        message: "Category with this name already exists",
      });
    }
    const category = new Category({ name, description, ...req.body });
    await category.save();

    res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
    });
  } catch (error) {
    console.log("Unable to create category", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCategory = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    console.log("All Category  getting failed  ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id))
      return res.status(400).json({ success: false, message: "Invalid" });

    const category = await Category.findById({ _id: id }).lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    console.log("Category By Id getting failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const category = await Category.findOne({ slug: slug, isActive: true })
      .populate({
        path: "packages",
        match: { status: "published" },
        select: "title slug coverImage destination batch duration",
        populate: [
          {
            path: "destination",
            model: "Destination",
            select: "name slug country state city",
          },
          {
            path: "batch",
            model: "Batch",
          },
        ],
      })
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }
    res.status(200).json({
      success: true,
      data: {
        category,
      },
    });
  } catch (error) {
    console.log("Category By Slug getting failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Category not found",
      });
    }

    const category = await Category.findOneAndUpdate({ slug }, req.body, {
      new: true,
    });
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: category,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    // category.isActive = false;
    const deletedCategory = await Category.findByIdAndDelete(id);
    await category.save();

    res.status(200).json({
      success: true,
      message: "Category deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
export {
  createCategory,
  getCategory,
  getCategoryBySlug,
  updateCategory,
  deleteCategory,
  getCategoryById,
};
