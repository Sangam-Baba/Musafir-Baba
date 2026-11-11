import mongoose from "mongoose";
import { RentalCityPage } from "../models/RentalCityPage.js";
import { VehiclePickUpDestination } from "../models/VehiclePickUpDestination.js";
import { VehicleType } from "../models/VehicleType.js";

const PAIR_TAKEN_MESSAGE =
  "A city + type page for this city and vehicle type already exists. Edit that one instead.";

// Only the fields admins edit -- never _id/timestamps from the client
const pickFields = (body = {}) => {
  const fields = {};
  for (const key of [
    "location",
    "vehicleType",
    "title",
    "bannerImage",
    "content",
    "metaTitle",
    "metaDescription",
    "keywords",
    "faqs",
    "status",
  ]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  return fields;
};

const validatePair = async (location, vehicleType) => {
  if (!mongoose.isValidObjectId(location)) return "Please select a city";
  if (!mongoose.isValidObjectId(vehicleType)) return "Please select a vehicle type";
  const [loc, type] = await Promise.all([
    VehiclePickUpDestination.exists({ _id: location }),
    VehicleType.exists({ _id: vehicleType }),
  ]);
  if (!loc) return "Destination not found";
  if (!type) return "Vehicle type not found";
  return null;
};

const populate = (query) =>
  query
    .populate("location", "name slug status")
    .populate("vehicleType", "name slug status");

// Admin list
export const getAllRentalCityPages = async (req, res) => {
  try {
    const data = await populate(RentalCityPage.find().sort({ createdAt: -1 })).lean();
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Admin edit form
export const getRentalCityPageById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "City + type page not found" });
    }
    const data = await RentalCityPage.findById(id).lean();
    if (!data) return res.status(404).json({ success: false, message: "City + type page not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// Public: the active page for ?location={id}&type={id}, used by
// /rental/{location}/{type}. 404 when there is none (page then auto-fills).
export const getRentalCityPageForPair = async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    const { location, type } = req.query;
    if (!mongoose.isValidObjectId(location) || !mongoose.isValidObjectId(type)) {
      return res.status(404).json({ success: false, message: "City + type page not found" });
    }
    const data = await RentalCityPage.findOne({
      location,
      vehicleType: type,
      status: "active",
    }).lean();
    if (!data) return res.status(404).json({ success: false, message: "City + type page not found" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const createRentalCityPage = async (req, res) => {
  try {
    const fields = pickFields(req.body);
    const invalid = await validatePair(fields.location, fields.vehicleType);
    if (invalid) return res.status(400).json({ success: false, message: invalid });
    if (await RentalCityPage.exists({ location: fields.location, vehicleType: fields.vehicleType })) {
      return res.status(409).json({ success: false, message: PAIR_TAKEN_MESSAGE });
    }
    const data = await RentalCityPage.create(fields);
    res.status(201).json({ success: true, message: "City + type page created", data });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: PAIR_TAKEN_MESSAGE });
    }
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const updateRentalCityPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "City + type page not found" });
    }
    const existing = await RentalCityPage.findById(id).select("location vehicleType").lean();
    if (!existing) return res.status(404).json({ success: false, message: "City + type page not found" });

    const fields = pickFields(req.body);
    const location = fields.location ?? existing.location;
    const vehicleType = fields.vehicleType ?? existing.vehicleType;
    const invalid = await validatePair(location, vehicleType);
    if (invalid) return res.status(400).json({ success: false, message: invalid });
    if (await RentalCityPage.exists({ _id: { $ne: id }, location, vehicleType })) {
      return res.status(409).json({ success: false, message: PAIR_TAKEN_MESSAGE });
    }

    const data = await RentalCityPage.findByIdAndUpdate(id, fields, {
      new: true,
      runValidators: true,
    });
    res.status(200).json({ success: true, message: "City + type page updated", data });
  } catch (error) {
    if (error?.code === 11000) {
      return res.status(409).json({ success: false, message: PAIR_TAKEN_MESSAGE });
    }
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export const deleteRentalCityPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(404).json({ success: false, message: "City + type page not found" });
    }
    const data = await RentalCityPage.findByIdAndDelete(id);
    if (!data) return res.status(404).json({ success: false, message: "City + type page not found" });
    res.status(200).json({ success: true, message: "City + type page deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server Error" });
  }
};
