import mongoose from "mongoose";
import { AppBanner } from "../models/AppBanner.js";
import { AppAnnouncement } from "../models/AppAnnouncement.js";
import { cleanBannerInput, cleanAnnouncementInput, getHomeContent, deliverAnnouncement, isLive } from "../services/appHome.service.js";

const fail = (res, e, label) => {
  console.error(`${label} error:`, e);
  return res.status(500).json({ success: false, message: "Something went wrong" });
};
const badId = (id) => !mongoose.Types.ObjectId.isValid(id);

// ---- App (public) ----
export const getAppHome = async (req, res) => {
  try {
    res.set("Cache-Control", "public, max-age=60");
    return res.json({ success: true, data: await getHomeContent() });
  } catch (e) {
    return fail(res, e, "Get app home");
  }
};

// ---- Admin: banners ----
export const adminListBanners = async (req, res) => {
  try {
    const banners = await AppBanner.find().sort({ order: 1, createdAt: -1 }).lean();
    const now = new Date();
    return res.json({ success: true, data: banners.map((b) => ({ ...b, live: isLive(b, now) })) });
  } catch (e) {
    return fail(res, e, "List banners");
  }
};

export const adminCreateBanner = async (req, res) => {
  try {
    const { value, error } = cleanBannerInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    if (value.order === undefined) {
      const last = await AppBanner.findOne().sort({ order: -1 }).select("order").lean();
      value.order = (last?.order ?? -1) + 1;
    }
    const banner = await AppBanner.create(value);
    return res.status(201).json({ success: true, data: banner });
  } catch (e) {
    return fail(res, e, "Create banner");
  }
};

export const adminUpdateBanner = async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ success: false, message: "Banner not found" });
    const { value, error } = cleanBannerInput(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, message: error });
    const banner = await AppBanner.findByIdAndUpdate(req.params.id, { $set: value }, { new: true, runValidators: true });
    if (!banner) return res.status(404).json({ success: false, message: "Banner not found" });
    return res.json({ success: true, data: banner });
  } catch (e) {
    return fail(res, e, "Update banner");
  }
};

export const adminReorderBanners = async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.ids) ? req.body.ids.filter((id) => !badId(id)) : [];
    if (!ids.length) return res.status(400).json({ success: false, message: "Nothing to reorder" });
    await AppBanner.bulkWrite(ids.map((id, i) => ({ updateOne: { filter: { _id: id }, update: { $set: { order: i } } } })));
    return res.json({ success: true });
  } catch (e) {
    return fail(res, e, "Reorder banners");
  }
};

export const adminDeleteBanner = async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ success: false, message: "Banner not found" });
    const r = await AppBanner.deleteOne({ _id: req.params.id });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: "Banner not found" });
    return res.json({ success: true });
  } catch (e) {
    return fail(res, e, "Delete banner");
  }
};

// ---- Admin: announcements ----
export const adminListAnnouncements = async (req, res) => {
  try {
    const list = await AppAnnouncement.find().sort({ createdAt: -1 }).limit(100).lean();
    const now = new Date();
    return res.json({ success: true, data: list.map((a) => ({ ...a, live: isLive(a, now) })) });
  } catch (e) {
    return fail(res, e, "List announcements");
  }
};

export const adminCreateAnnouncement = async (req, res) => {
  try {
    const { value, error } = cleanAnnouncementInput(req.body);
    if (error) return res.status(400).json({ success: false, message: error });
    const ann = await AppAnnouncement.create(value);
    // Live right away: deliver now in the background (scheduled ones are
    // delivered when their start time arrives -- see getHomeContent).
    if (isLive(ann)) deliverAnnouncement(ann._id).catch((e) => console.error("Announcement delivery error:", e));
    return res.status(201).json({ success: true, data: ann });
  } catch (e) {
    return fail(res, e, "Create announcement");
  }
};

// Editing never re-sends; it only changes what Home shows (and the window).
export const adminUpdateAnnouncement = async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ success: false, message: "Update not found" });
    const { value, error } = cleanAnnouncementInput(req.body, { partial: true });
    if (error) return res.status(400).json({ success: false, message: error });
    const ann = await AppAnnouncement.findByIdAndUpdate(req.params.id, { $set: value }, { new: true, runValidators: true });
    if (!ann) return res.status(404).json({ success: false, message: "Update not found" });
    if (isLive(ann) && ann.delivery?.status === "PENDING") deliverAnnouncement(ann._id).catch((e) => console.error("Announcement delivery error:", e));
    return res.json({ success: true, data: ann });
  } catch (e) {
    return fail(res, e, "Update announcement");
  }
};

// Retry after a failed delivery (riders who already got it are skipped).
export const adminRetryAnnouncement = async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ success: false, message: "Update not found" });
    const ann = await AppAnnouncement.findOneAndUpdate(
      { _id: req.params.id, "delivery.status": "FAILED" },
      { $set: { "delivery.status": "PENDING", "delivery.error": "" } },
      { new: true }
    );
    if (!ann) return res.status(400).json({ success: false, message: "Only a failed delivery can be retried" });
    if (isLive(ann)) deliverAnnouncement(ann._id).catch((e) => console.error("Announcement delivery error:", e));
    return res.json({ success: true, data: ann });
  } catch (e) {
    return fail(res, e, "Retry announcement");
  }
};

export const adminDeleteAnnouncement = async (req, res) => {
  try {
    if (badId(req.params.id)) return res.status(404).json({ success: false, message: "Update not found" });
    const r = await AppAnnouncement.deleteOne({ _id: req.params.id });
    if (!r.deletedCount) return res.status(404).json({ success: false, message: "Update not found" });
    return res.json({ success: true });
  } catch (e) {
    return fail(res, e, "Delete announcement");
  }
};
