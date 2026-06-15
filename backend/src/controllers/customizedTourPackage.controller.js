import { CustomizedTourPackage } from "../models/CustomizedTourPackage.js";
import mongoose from "mongoose";
import { Destination } from "../models/Destination.js";
import { Staff } from "../models/Staff.js";

const createCustomizedTourPackage = async (req, res) => {
  try {
    const { title, slug, plans, destination } = req.body;
    if (!title || !slug || !plans || !destination) {
      return res.status(400).json({ message: "ooops!Missing required fields" });
    }
    if (req.user && req.user.role === "staff") {
      req.body.status = "draft";
      let staffName = "Unknown Staff";
      if (req.user.sub) {
        const staffObj = await Staff.findById(req.user.sub).select("name");
        if (staffObj) staffName = staffObj.name;
      }
      req.body.pendingUpdates = {
        data: { ...req.body },
        updatedBy: req.user.name || staffName,
        updatedAt: new Date(),
      };
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
    const existingPkg = await CustomizedTourPackage.findById(id);
    if (!existingPkg) {
      return res.status(404).json({ message: "Customized tour package not found" });
    }

    if (existingPkg.status === "published") {
      let staffName = "Unknown Staff";
      if (req.user && req.user.sub) {
        const staffObj = await Staff.findById(req.user.sub).select("name");
        if (staffObj) {
          staffName = staffObj.name;
        }
      }

      existingPkg.pendingUpdates = {
        data: { ...req.body },
        updatedBy: req.user.name || staffName,
        updatedAt: new Date()
      };
      await existingPkg.save();

      return res.status(200).json({
        success: true,
        message: "Updates saved as draft pending admin approval.",
        data: existingPkg,
      });
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
          { slug: req.query.destination },
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
      .populate("plans")
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
      .populate("reviews")
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

const approveCustomizedTourUpdates = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const pkg = await CustomizedTourPackage.findById(id);
    if (!pkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    if (!pkg.pendingUpdates || !pkg.pendingUpdates.data) {
      return res.status(400).json({ success: false, message: "No pending updates to approve" });
    }

    let updateData = { status: "published" };
    if (pkg.pendingUpdates && pkg.pendingUpdates.data) {
      updateData = { ...pkg.pendingUpdates.data, status: "published" };
    }
    
    // Clear pendingUpdates before applying
    updateData.$unset = { pendingUpdates: 1 };

    const updatedPkg = await CustomizedTourPackage.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Package updates approved successfully",
      data: updatedPkg,
    });
  } catch (error) {
    console.log("Error approving package updates:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

const rejectCustomizedTourUpdates = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: "Invalid ID" });
    }

    const updatedPkg = await CustomizedTourPackage.findByIdAndUpdate(
      id,
      { $unset: { pendingUpdates: 1 } },
      { new: true }
    );

    if (!updatedPkg) {
      return res.status(404).json({ success: false, message: "Package not found" });
    }

    res.status(200).json({
      success: true,
      message: "Package updates rejected successfully",
      data: updatedPkg,
    });
  } catch (error) {
    console.log("Error rejecting package updates:", error.message);
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
    })
      .populate("destination", "_id name country state city slug")
      .lean();
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
  approveCustomizedTourUpdates,
  rejectCustomizedTourUpdates,
};
