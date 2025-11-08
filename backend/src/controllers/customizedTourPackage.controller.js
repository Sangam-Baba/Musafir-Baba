import { CustomizedTourPackage } from "../models/CustomizedTourPackage.js";
import mongoose from "mongoose";
import { Destination } from "../models/Destination.js";
const createCustomizedTourPackage = async (req, res) => {
  try {
    const { title, slug, plans, destination } = req.body;
    if (!title || !slug || !plans || !destination) {
      return res.status(400).json({ message: "ooops!Missing required fields" });
    }
    const customizedTourPackage = await CustomizedTourPackage.create({
      ...req.body,
    });
    res.status(201).json({
      success: true,
      message: "Customized tour package created successfully",
      data: customizedTourPackage,
    });
  } catch (error) {
    console.log("Error creating customized tour package", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const updateCustomizedTourPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedTourPackage = await CustomizedTourPackage.findByIdAndUpdate(
      id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!customizedTourPackage) {
      return res
        .status(404)
        .json({ message: "Customized tour package not found" });
    }
    res.status(200).json({
      success: true,
      message: "Customized tour package updated successfully",
      data: customizedTourPackage,
    });
  } catch (error) {
    console.log("Error updating customized tour package", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getAllCustomizedTourPackages = async (req, res) => {
  try {
    const { filter = {} } = req.query;
    const destination = req.query?.destination?.trim();
    if (destination && destination !== "undefined" && destination !== "null") {
      // If you want to allow name/slug instead of ObjectId
      const dest = await Destination.findOne({
        $or: [
          { country: req.query.destination },
          { state: req.query.destination },
          { city: req.query.destination },
        ],
      }).select("_id");
      if (!dest) {
        return res
          .status(404)
          .json({ success: false, message: "Destination not found" });
      }
      filter.destination = dest._id;
    }
    if (req.query?.title) filter.title = req.query.title;
    if (req.query?.slug) filter.slug = req.query.slug;
    if (req.query?.status) filter.status = req.query.status;
    const customizedTourPackages = await CustomizedTourPackage.find(filter)
      .populate("destination", "_id name country state city slug")
      .lean();
    res.status(200).json({
      success: true,
      message: "Customized tour packages fetched successfully",
      data: customizedTourPackages,
    });
  } catch (error) {
    console.log("Error getting all customized tour packages", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomizedTourPackageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedTourPackage = await CustomizedTourPackage.findById(id)
      .populate("destination", "_id name country state city slug")
      .lean();
    if (!customizedTourPackage) {
      return res
        .status(404)
        .json({ message: "Customized tour package not found" });
    }
    res.status(200).json({
      success: true,
      message: "Customized tour package fetched successfully",
      data: customizedTourPackage,
    });
  } catch (error) {
    console.log("Error getting customized tour package by id", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getCustomizedTourPackageBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const customizedTourPackage = await CustomizedTourPackage.findOne({
      slug,
    })
      .populate("destination", "_id name country state city slug")
      .lean();
    if (!customizedTourPackage) {
      return res
        .status(404)
        .json({ message: "Customized tour package not found" });
    }
    res.status(200).json({
      success: true,
      message: "Customized tour package fetched successfully",
      data: customizedTourPackage,
    });
  } catch (error) {
    console.log("Error getting customized tour package by slug", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};
const deleteCustomizedTourPackage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const customizedTourPackage = await CustomizedTourPackage.findByIdAndDelete(
      id
    );
    if (!customizedTourPackage) {
      return res
        .status(404)
        .json({ message: "Customized tour package not found" });
    }
    res.status(200).json({
      success: true,
      message: "Customized tour package deleted successfully",
      data: customizedTourPackage,
    });
  } catch (error) {
    console.log("Error deleting customized tour package", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const getRelatedTour = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res.status(400).json({ success: false, message: "Invalid Slug" });
    }
    const customizedTourPackage = await CustomizedTourPackage.findOne({
      slug,
    }).lean();
    if (!customizedTourPackage) {
      return res
        .status(404)
        .json({ message: "Customized tour package not found" });
    }
    const relatedTours = await CustomizedTourPackage.find({
      keywords: { $in: customizedTourPackage.keywords },
    }).lean();
    res.status(200).json({
      success: true,
      message: "Related tour fetched successfully",
      data: relatedTours,
    });
  } catch (error) {
    console.log("Error getting related tour", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

export {
  createCustomizedTourPackage,
  updateCustomizedTourPackage,
  getAllCustomizedTourPackages,
  getCustomizedTourPackageById,
  deleteCustomizedTourPackage,
  getCustomizedTourPackageBySlug,
  getRelatedTour,
};
