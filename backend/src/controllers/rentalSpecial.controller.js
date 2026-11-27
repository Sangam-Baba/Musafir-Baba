import mongoose from "mongoose";
import slugify from "slugify";
import { RentalSpecialType } from "../models/RentalSpecialType.js";
import { RentalSpecialPage } from "../models/RentalSpecialPage.js";
import { VehicleType } from "../models/VehicleType.js";
import { VehiclePickUpDestination } from "../models/VehiclePickUpDestination.js";

// Special rental types + pages (/rental/{special-type}[/{slug}]).
// New collections only; existing models are only read (to block slug clashes
// with vehicle types and cities, which own the same URL positions).

const toSlug = (value) => slugify(String(value ?? ""), { lower: true, strict: true });
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const isId = (v) => mongoose.isValidObjectId(v);
const fail = (res, status, message) => res.status(status).json({ success: false, message });
const serverError = (res) => fail(res, 500, "Server Error");

/* ---------------------------------------------------------------- types */

// A vehicle type or city with this slug (or a name their slug lookups would
// match) owns /rental/{slug} first, so the name is refused.
const takenBy = async (Model, slug) => {
  const regex = new RegExp(`^${escapeRegex(slug.replace(/-/g, " "))}$`, "i");
  return Boolean((await Model.exists({ slug })) || (await Model.exists({ name: regex })));
};

const typeFields = async (body = {}, res) => {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return fail(res, 400, "Please enter a name");
  const slug = toSlug(name);
  if (!slug) return fail(res, 400, "Please enter a name with letters or numbers");
  if (await takenBy(VehicleType, slug)) {
    return fail(res, 409, "A vehicle type already uses this name. Please choose another name.");
  }
  if (await takenBy(VehiclePickUpDestination, slug)) {
    return fail(res, 409, "A city (pickup destination) already uses this name. Please choose another name.");
  }
  const status = body.status === "inactive" ? "inactive" : "active";
  return { name, slug, status };
};

export const getAllSpecialTypes = async (req, res) => {
  try {
    const query = req.query.all ? {} : { status: "active" };
    const data = await RentalSpecialType.find(query).sort({ createdAt: -1 }).lean();
    res.status(200).json({ success: true, data });
  } catch {
    serverError(res);
  }
};

export const getSpecialTypeById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Special type not found");
    const data = await RentalSpecialType.findById(req.params.id).lean();
    if (!data) return fail(res, 404, "Special type not found");
    res.status(200).json({ success: true, data });
  } catch {
    serverError(res);
  }
};

export const createSpecialType = async (req, res) => {
  try {
    const fields = await typeFields(req.body, res);
    if (res.headersSent) return;
    const data = await RentalSpecialType.create(fields);
    res.status(201).json({ success: true, message: "Special type created", data });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "This special type already exists");
    serverError(res);
  }
};

export const updateSpecialType = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Special type not found");
    const fields = await typeFields(req.body, res);
    if (res.headersSent) return;
    const data = await RentalSpecialType.findByIdAndUpdate(req.params.id, fields, {
      new: true,
      runValidators: true,
    });
    if (!data) return fail(res, 404, "Special type not found");
    res.status(200).json({ success: true, message: "Special type updated", data });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, "This special type already exists");
    serverError(res);
  }
};

export const deleteSpecialType = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Special type not found");
    if (await RentalSpecialPage.exists({ specialType: req.params.id })) {
      return fail(res, 409, "Pages still use this special type. Delete or move those pages first.");
    }
    const data = await RentalSpecialType.findByIdAndDelete(req.params.id);
    if (!data) return fail(res, 404, "Special type not found");
    res.status(200).json({ success: true, message: "Special type deleted" });
  } catch {
    serverError(res);
  }
};

/* ---------------------------------------------------------------- pages */

const PAGE_TAKEN = "A special page with this special type and permalink already exists.";

const point = (p) => {
  if (!p || typeof p !== "object") return undefined;
  const out = { address: typeof p.address === "string" ? p.address.trim() : "" };
  if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) Object.assign(out, { lat: p.lat, lng: p.lng });
  return out;
};

// Only the fields admins edit -- never _id/timestamps from the client
const pageFields = (body = {}) => {
  const fields = {};
  for (const key of ["specialType", "title", "bannerImage", "content", "metaTitle", "metaDescription", "keywords", "faqs", "status"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.slug !== undefined) fields.slug = toSlug(body.slug);
  if (body.searchFrom !== undefined) fields.searchFrom = point(body.searchFrom);
  if (body.searchTo !== undefined) fields.searchTo = point(body.searchTo);
  if (body.author !== undefined) fields.author = isId(body.author) ? body.author : null;
  return fields;
};

const validatePage = async ({ specialType }) => {
  if (!isId(specialType)) return "Please select a special type";
  if (!(await RentalSpecialType.exists({ _id: specialType }))) return "Special type not found";
  return null;
};

const populatePage = (query) => query.populate("specialType", "name slug status");

export const getAllSpecialPages = async (req, res) => {
  try {
    const data = await populatePage(RentalSpecialPage.find().sort({ createdAt: -1 })).lean();
    res.status(200).json({ success: true, data });
  } catch {
    serverError(res);
  }
};

export const getSpecialPageById = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Special page not found");
    const data = await RentalSpecialPage.findById(req.params.id).lean();
    if (!data) return fail(res, 404, "Special page not found");
    res.status(200).json({ success: true, data });
  } catch {
    serverError(res);
  }
};

export const createSpecialPage = async (req, res) => {
  try {
    const fields = pageFields(req.body);
    fields.slug = fields.slug ?? "";
    const invalid = await validatePage(fields);
    if (invalid) return fail(res, 400, invalid);
    if (await RentalSpecialPage.exists({ specialType: fields.specialType, slug: fields.slug })) {
      return fail(res, 409, PAGE_TAKEN);
    }
    const data = await RentalSpecialPage.create(fields);
    res.status(201).json({ success: true, message: "Special page created", data });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, PAGE_TAKEN);
    serverError(res);
  }
};

export const updateSpecialPage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return fail(res, 404, "Special page not found");
    const existing = await RentalSpecialPage.findById(id).select("specialType slug").lean();
    if (!existing) return fail(res, 404, "Special page not found");
    const fields = pageFields(req.body);
    const key = {
      specialType: fields.specialType ?? existing.specialType,
      slug: fields.slug ?? existing.slug ?? "",
    };
    const invalid = await validatePage(key);
    if (invalid) return fail(res, 400, invalid);
    if (await RentalSpecialPage.exists({ _id: { $ne: id }, ...key })) return fail(res, 409, PAGE_TAKEN);
    const data = await RentalSpecialPage.findByIdAndUpdate(id, fields, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: "Special page updated", data });
  } catch (error) {
    if (error?.code === 11000) return fail(res, 409, PAGE_TAKEN);
    serverError(res);
  }
};

export const deleteSpecialPage = async (req, res) => {
  try {
    if (!isId(req.params.id)) return fail(res, 404, "Special page not found");
    const data = await RentalSpecialPage.findByIdAndDelete(req.params.id);
    if (!data) return fail(res, 404, "Special page not found");
    res.status(200).json({ success: true, message: "Special page deleted" });
  } catch {
    serverError(res);
  }
};

/* --------------------------------------------------------------- public */

// Same default author as vehicle pages when none is picked
const withDefaultAuthor = async (page) => {
  if (page.author) return page;
  const { Author } = await import("../models/Authors.js");
  const fallback = await Author.findOne({ name: /Abhishek Rai/i }).select("name role about avatar").lean();
  return fallback ? { ...page, author: fallback } : page;
};

// Public: GET /rental-special/lookup?type={seg}&slug={seg?}
// The active page for those URL segments, or 404. Used by the rental pages
// only after their own lookup found nothing, so it never changes a vehicle,
// type or city URL.
export const lookupSpecialPage = async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    const { type } = req.query;
    const slug = typeof req.query.slug === "string" ? req.query.slug : "";
    if (typeof type !== "string" || !type) return fail(res, 404, "Special page not found");
    const specialType = await RentalSpecialType.findOne({ slug: toSlug(type), status: "active" }).lean();
    if (!specialType) return fail(res, 404, "Special page not found");
    const page = await RentalSpecialPage.findOne({
      specialType: specialType._id,
      slug: toSlug(slug),
      status: "active",
    })
      .populate("specialType", "name slug")
      .populate("author", "name role about avatar")
      .lean();
    if (!page) return fail(res, 404, "Special page not found");
    res.status(200).json({ success: true, data: await withDefaultAuthor(page) });
  } catch {
    serverError(res);
  }
};
