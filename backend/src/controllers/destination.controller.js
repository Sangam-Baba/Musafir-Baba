import { Destination } from "../models/Destination.js";
import { CustomizedTourPackage } from "../models/CustomizedTourPackage.js";
import { Package } from "../models/Package.js";
import mongoose from "mongoose";
import { uploadToCloudinary } from "../services/fileUpload.service.js";
const createDestination = async (req, res) => {
  try {
    const { name, country } = req.body;
    let coverImage = null;
    let gallery = [];
    if (req.files?.coverImage) {
      const result = await uploadToCloudinary(
        req.files.coverImage[0].buffer,
        "destination/coverImage"
      );
      coverImage = result.secure_url;
    }
    if (req.files?.gallery) {
      for (let img = 0; img < req.files.gallery.length; img++) {
        const result = await uploadToCloudinary(
          req.files.gallery[img].buffer,
          "destination/gallery"
        );
        gallery.push(result.secure_url);
      }
    }
    const destination = new Destination({ ...req.body, coverImage, gallery });
    await destination.save();
    res.status(201).json({
      success: true,
      message: "Destination created successful",
      data: destination,
    });
  } catch (error) {
    console.log("Destination Creation Failed ", error.message);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const getAllDestination = async (req, res) => {
  try {
    const { search, country, state, status } = req.query;
    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(parseInt(req.query.limit || "100"), 100);
    const skip = (page - 1) * limit;

    const filter = {};

    if (search) filter.name = { $regex: search, $options: "i" };
    if (state) filter.state = state;
    if (country) filter.country = country;
    if (status) filter.status = status;

    const destination = await Destination.find(filter)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Destination.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: destination,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.log("All Destination getting Failed ", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getDestinationById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const destination = await Destination.findById(id);

    if (!destination) {
      return res
        .status(404)
        .json({ success: false, error: "Destination not found" });
    }

    const packages = await Package.find({
      destination: id,
      status: "published",
    }).select("title price duration coverImage slug isFeatured status");

    res.status(200).json({
      success: true,
      data: {
        destination,
        packages,
      },
    });
  } catch (error) {
    console.log("Destination getting Failed ", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getDestinationBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({ success: false, error: "Invalid Slug" });
    }

    const destination = await Destination.findOne({
      slug: slug,
      status: "published",
    });
    res.status(200).json({
      success: true,
      data: destination,
    });
  } catch (error) {
    console.log("Destination getting by slug Failed ", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const updateDestination = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({ success: false, error: "Invalid ID" });
    }
    const destination = await Destination.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!destination)
      return res
        .status(404)
        .json({ success: false, message: "Destination not found" });

    res.status(200).json({
      success: true,
      message: "Destination updated successfully",
      data: destination,
    });
  } catch (error) {
    console.log("Destination Update Failed ", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const deleteDestination = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, error: "Invalid ID" });
    }

    const destination = await Destination.findByIdAndDelete(id);

    if (!destination) {
      return res
        .status(404)
        .json({ success: false, error: "Destination not found" });
    }

    res.status(200).json({
      success: true,
      message: "Destination deleted successfully",
    });
  } catch (error) {
    console.log("Destination delition Failed ", error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

const getOnlyDestination = async (req, res) => {
  try {
    const alldest = await Destination.find({ status: "published" }).select(
      "_id name country state"
    );
    if (!alldest)
      return res
        .status(404)
        .json({ success: false, message: "Destination not found" });
    res.status(200).json({ success: true, data: alldest });
  } catch (error) {
    console.log("Only Destination getting failed", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

const getDestinationByCategoryId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "id required things missing" });
    }
    if (id === "691809074507e98432f338b9") {
      const pkg = await CustomizedTourPackage.find({ status: "published" })
        .select("destination")
        .populate("destination", "_id state");
      if (!pkg || pkg.length === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Destination not found" });
      }
      const uniqueDestination = [
        ...new Set(pkg.map((item) => item.destination)),
      ];
      return res.status(200).json({
        success: true,
        message: "Customized Destination found",
        data: uniqueDestination,
      });
    }
    const pkg = await Package.find({ mainCategory: id })
      .select("destination")
      .populate("destination", "_id state");
    if (!pkg || pkg.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Destination not found" });
    }
    const uniqueDestination = [...new Set(pkg.map((item) => item.destination))];

    res.status(200).json({
      success: true,
      message: "Destination found",
      data: uniqueDestination,
    });
  } catch (error) {
    console.log("Destination getting Failed ", error.message);
    res.status(500).json({
      success: false,
      message: `Server Error: ${error.message}`,
    });
  }
};
export {
  createDestination,
  getAllDestination,
  getDestinationById,
  updateDestination,
  deleteDestination,
  getOnlyDestination,
  getDestinationByCategoryId,
  getDestinationBySlug,
};
