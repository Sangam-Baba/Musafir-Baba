import mongoose from "mongoose";
import slugify from "slugify";
import { Vehicle } from "../models/Vehicle.js";
import { VehiclePickUpDestination } from "../models/VehiclePickUpDestination.js";

// Public vehicle URLs are /rental/{location}/{type}/{slug}, so a slug only has
// to be unique within its pickup location (the same slug may exist in Delhi
// and in Lucknow as two separate vehicles).

// Same normalisation the Vehicle model hooks apply before saving a slug
const normaliseSlug = (value) =>
  value ? slugify(String(value), { lower: true, strict: true }) : "";

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Another vehicle at this location already uses this slug?
const slugTakenAtLocation = async ({ slug, location, excludeId }) => {
  if (!slug || !location || !mongoose.isValidObjectId(location)) return false;
  const query = { slug, location };
  if (excludeId) query._id = { $ne: excludeId };
  return Boolean(await Vehicle.exists(query));
};

// Pickup-location _id from a URL segment (its slug; for older locations
// without a slug, its name -- same fallback as master-data getBySlug).
// Returns null when the segment is not a location.
const resolveLocationId = async (segment) => {
  if (typeof segment !== "string" || !segment) return null;
  let loc = await VehiclePickUpDestination.findOne({ slug: segment }).select("_id").lean();
  if (!loc) {
    const regex = new RegExp(`^${escapeRegex(segment.replace(/-/g, " "))}$`, "i");
    loc = await VehiclePickUpDestination.findOne({ name: regex }).select("_id").lean();
  }
  return loc?._id ?? null;
};

const DUPLICATE_SLUG_MESSAGE =
  "Another vehicle at this destination already uses this permalink. Please change the permalink.";
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
    if (
      await slugTakenAtLocation({
        slug: normaliseSlug(req.body.slug || req.body.title),
        location: req.body.location,
      })
    ) {
      return res.status(409).json({ success: false, message: DUPLICATE_SLUG_MESSAGE });
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
    // Only when this save changes the slug or the location, so existing
    // records keep saving exactly as before
    const existing = await Vehicle.findById(id).select("slug location").lean();
    if (existing) {
      const nextSlug = req.body.slug
        ? normaliseSlug(req.body.slug)
        : req.body.title
          ? normaliseSlug(req.body.title)
          : existing.slug;
      const nextLocation = req.body.location || existing.location;
      const changed =
        nextSlug !== existing.slug || String(nextLocation ?? "") !== String(existing.location ?? "");
      if (
        changed &&
        (await slugTakenAtLocation({ slug: nextSlug, location: nextLocation, excludeId: id }))
      ) {
        return res.status(409).json({ success: false, message: DUPLICATE_SLUG_MESSAGE });
      }
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
      .populate("location", "name slug city state")
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
    // ?location={slug} picks the vehicle at that location when the same slug
    // exists in several; without it (or when it matches nothing) the lookup
    // is the original slug-only one
    const findOne = (filter) =>
      Vehicle.findOne(filter)
        .populate("location", "name slug city state")
        .populate("author", "name role about avatar")
        .lean();
    const locationId = await resolveLocationId(req.query.location);
    let vehicle = locationId
      ? await findOne({ slug: slug, status: "published", location: locationId })
      : null;
    if (!vehicle) {
      vehicle = await findOne({ slug: slug, status: "published" });
    }
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
    // Same ?location= preference as getVehicleBySlug
    const locationId = await resolveLocationId(req.query.location);
    let vehicle = locationId
      ? await Vehicle.findOne({ slug, status: "published", location: locationId })
      : null;
    if (!vehicle) {
      vehicle = await Vehicle.findOne({ slug, status: "published" });
    }

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
      .populate("location", "name slug city state")
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

// Copies a vehicle into another pickup location as a DRAFT (admin reviews
// price/stock, then publishes). Same slug is kept -- allowed, since slugs only
// need to be unique per location. canonicalUrl is left out so the model hook
// regenerates it for the new location.
const duplicateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const location = req.body?.location;
    if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(location)) {
      return res.status(400).json({ success: false, message: "Please select a destination" });
    }

    const source = await Vehicle.findById(id).lean();
    if (!source) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }
    if (String(source.location ?? "") === String(location)) {
      return res.status(400).json({ success: false, message: "This vehicle is already at that destination" });
    }
    if (!(await VehiclePickUpDestination.exists({ _id: location }))) {
      return res.status(404).json({ success: false, message: "Destination not found" });
    }
    if (await slugTakenAtLocation({ slug: normaliseSlug(source.slug || source.title), location })) {
      return res.status(409).json({ success: false, message: DUPLICATE_SLUG_MESSAGE });
    }

    const { _id, __v, createdAt, updatedAt, canonicalUrl, ...fields } = source;
    // Fresh ids for embedded items (gallery, FAQs, seating options, ...)
    const stripIds = (list) =>
      Array.isArray(list) ? list.map(({ _id: _omit, ...item }) => item) : list;
    const copy = await Vehicle.create({
      ...fields,
      gallery: stripIds(fields.gallery),
      faqs: stripIds(fields.faqs),
      seatingOptions: stripIds(fields.seatingOptions),
      helpfulResources: stripIds(fields.helpfulResources),
      tabsConfig: stripIds(fields.tabsConfig),
      location,
      status: "draft",
    });

    res.status(201).json({
      success: true,
      message: "Vehicle duplicated as a draft",
      data: copy,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Duplicate failed due to server error" });
  }
};

export {
  duplicateVehicle,
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
