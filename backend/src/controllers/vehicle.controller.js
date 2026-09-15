import mongoose from "mongoose";
import { Vehicle } from "../models/Vehicle.js";
const createVehicle = async (req, res) => {
  try {
    const {
      vehicleName,
      vehicleType,
      vehicleYear,
      vehicleBrand,
      fuelType,
      vehicleMilage,
      vehicleModel,
      seats,
      price,
      title,
      slug,
      content,
      availableStock,
      gallery,
      metaTitle,
      metaDescription,
      canonicalUrl,
      excerpt,
      faqs,
      location,
      status,
    } = req.body;
    if (!price || !vehicleName || !title || !fuelType) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required things" });
    }
    const vehicle = await Vehicle.create({
      vehicleName,
      vehicleType,
      vehicleYear,
      vehicleBrand,
      fuelType,
      vehicleMilage,
      vehicleModel,
      seats,
      price,
      title,
      slug,
      content,
      availableStock,
      gallery,
      metaTitle,
      metaDescription,
      canonicalUrl,
      excerpt,
      faqs,
      status,
      ...req.body,
    });
    if (!vehicle) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle created Successfully",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Missing Required Things" });
    }
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { ...req.body },
      { new: true },
    );
    if (!vehicle) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle created Successfully",
      data: vehicle,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Updated failed due to server error" });
  }
};

const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Missing Required Things" });
    }
    const vehicle = await Vehicle.findByIdAndDelete(id);
    if (!vehicle) {
      return res.status(500).json({ success: false, message: "Server Error" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle created Successfully",
      data: vehicle,
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Delete failed due to server error" });
  }
};

const getVehicleById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      res
        .status(400)
        .json({ success: false, message: "Missing Required Things" });
    }
    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res
        .status(500)
        .json({ success: false, message: "Vehile not found" });
    }
    res.status(201).json({
      success: true,
      message: "Vehicle getting by Id Successfully",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "getting by Id failed due to server error",
    });
  }
};

const getAllVehicle = async (req, res) => {
  try {
    const allVehicle = await Vehicle.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Successfully got all vehicles",
      data: allVehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error for getAllVehicle",
    });
  }
};

const getAllPublishedVehicle = async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    const allVehicle = await Vehicle.find({ status: "published" })
      .populate("location", "name city state")
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Successfully got all published vehicles",
      data: allVehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error for getAllPublishedVehicle",
    });
  }
};

// Lightweight companion to getAllPublishedVehicle for callers that only need
// the distinct vehicle types + locations for filter dropdowns (e.g. the
// homepage hero widget) -- avoids pulling every published vehicle's full
// document (galleries, long rich-text fields) just to read two small lists.
const getVehicleFilters = async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    const vehicles = await Vehicle.find({ status: "published" })
      .select("vehicleType location")
      .populate("location", "name")
      .lean();

    const types = Array.from(
      new Set(
        vehicles
          .map((v) => v.vehicleType?.toLowerCase())
          .filter((t) => Boolean(t))
      )
    );

    const seenLocations = new Map();
    vehicles.forEach((v) => {
      if (v.location?._id && !seenLocations.has(String(v.location._id))) {
        seenLocations.set(String(v.location._id), {
          id: v.location._id,
          name: v.location.name,
        });
      }
    });

    res.status(200).json({
      success: true,
      data: { types, locations: Array.from(seenLocations.values()) },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error for getVehicleFilters",
    });
  }
};
const getVehicleBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    if (!slug) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required things" });
    }
    let vehicle = await Vehicle.findOne({
      slug: slug,
      status: "published",
    }).populate("location", "name city state ")
      .populate("author", "name role about avatar")
      .lean();
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Invalid Slug" });
    }

    if (!vehicle.author) {
      const { Author } = await import("../models/Authors.js");
      const defaultAuthor = await Author.findOne({ name: /Abhishek Rai/i })
        .select("name role about avatar")
        .lean();
      if (defaultAuthor) {
        vehicle.author = defaultAuthor;
      }
    }
    res.status(200).json({
      success: true,
      message: "Getting Successfully Vehicle",
      data: vehicle,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server Error for getVehicleBySlug",
    });
  }
};

const getRelatedVehicle = async (req, res) => {
  try {
    const { slug } = req.params;

    if (!slug) {
      return res.status(400).json({
        success: false,
        message: "Slug is required",
      });
    }

    // 1Find current vehicle
    const vehicle = await Vehicle.findOne({ slug, status: "published" });

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: "Vehicle not found",
      });
    }

    //  Find related vehicles
    const relatedVehicles = await Vehicle.find({
      _id: { $ne: vehicle._id }, // exclude same vehicle
      status: "published", // only published for users
      $or: [{ seats: vehicle.seats }, { vehicleType: vehicle.vehicleType }],
    })
      .populate("location", "name city state")
      .limit(6) // limit results
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: "Successfully getting related vehicles",
      data: relatedVehicles,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export {
  createVehicle,
  updateVehicle,
  deleteVehicle,
  getVehicleById,
  getAllVehicle,
  getVehicleBySlug,
  getAllPublishedVehicle,
  getRelatedVehicle,
  getVehicleFilters,
};
