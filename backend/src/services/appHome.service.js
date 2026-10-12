import { Expo } from "expo-server-sdk";
import { AppBanner, BANNER_SCREENS } from "../models/AppBanner.js";
import { AppAnnouncement } from "../models/AppAnnouncement.js";
import { Notification } from "../models/Notification.js";
import RiderProfile from "../models/rider/RiderProfile.js";

// MBGo Home content: carousel banners + "Important Update" announcements.

export const BANNER_WIDTH = 1200;
export const BANNER_HEIGHT = 400;
export const MAX_BANNER_BYTES = 300 * 1024; // admin compresses to ~40-120 KB
export const MAX_LIVE_BANNERS = 8;

const expo = new Expo();

// Active and inside its optional date window.
export const isLive = (doc, now = new Date()) =>
  !!doc && doc.isActive !== false && (!doc.startAt || new Date(doc.startAt) <= now) && (!doc.endAt || new Date(doc.endAt) > now);

const liveQuery = (now) => ({
  isActive: true,
  $and: [
    { $or: [{ startAt: null }, { startAt: { $lte: now } }] },
    { $or: [{ endAt: null }, { endAt: { $gt: now } }] },
  ],
});

const toDate = (v) => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? "invalid" : d;
};

// Returns { value, error } -- value only holds fields that were provided.
export function cleanBannerInput(body = {}, { partial = false } = {}) {
  const out = {};
  if (body.title !== undefined || !partial) {
    const title = String(body.title || "").trim();
    if (!title) return { error: "Title is required" };
    if (title.length > 120) return { error: "Title must be 120 characters or less" };
    out.title = title;
  }
  if (body.image !== undefined || !partial) {
    const img = body.image || {};
    if (!img.url || !/^https:\/\//.test(img.url)) return { error: "Upload a banner image" };
    if (img.width && img.height && (img.width !== BANNER_WIDTH || img.height !== BANNER_HEIGHT)) {
      return { error: `Banner must be ${BANNER_WIDTH}x${BANNER_HEIGHT}` };
    }
    if (img.size && img.size > MAX_BANNER_BYTES) return { error: "Banner image is too large (max 300 KB)" };
    out.image = { url: img.url, key: img.key, width: img.width, height: img.height, size: img.size };
  }
  if (body.action !== undefined || !partial) {
    const a = body.action || {};
    const type = a.type || "NONE";
    if (!["NONE", "SCREEN", "URL"].includes(type)) return { error: "Invalid tap action" };
    if (type === "SCREEN" && !BANNER_SCREENS.includes(a.screen)) return { error: "Choose the screen to open" };
    if (type === "URL" && !/^https?:\/\/\S+$/.test(String(a.url || "").trim())) return { error: "Enter a valid link (https://...)" };
    out.action = { type, screen: type === "SCREEN" ? a.screen : null, url: type === "URL" ? String(a.url).trim() : undefined };
  }
  if (body.order !== undefined) out.order = Number(body.order) || 0;
  if (body.isActive !== undefined) out.isActive = !!body.isActive;
  for (const k of ["startAt", "endAt"]) {
    const d = toDate(body[k]);
    if (d === "invalid") return { error: `Invalid ${k === "startAt" ? "start" : "end"} date` };
    if (d !== undefined) out[k] = d;
  }
  if (out.startAt && out.endAt && out.endAt <= out.startAt) return { error: "End date must be after the start date" };
  return { value: out };
}

export function cleanAnnouncementInput(body = {}, { partial = false } = {}) {
  const out = {};
  if (body.headline !== undefined || !partial) {
    const headline = String(body.headline || "").trim().replace(/\s+/g, " ");
    if (!headline) return { error: "Headline is required" };
    if (headline.length > 90) return { error: "Headline must be 90 characters or less" };
    out.headline = headline;
  }
  if (body.message !== undefined || !partial) {
    const message = String(body.message || "").trim();
    if (!message) return { error: "Full message is required" };
    if (message.length > 1000) return { error: "Message must be 1000 characters or less" };
    out.message = message;
  }
  if (body.isActive !== undefined) out.isActive = !!body.isActive;
  if (body.sendPush !== undefined) out.sendPush = !!body.sendPush;
  for (const k of ["startAt", "endAt"]) {
    const d = toDate(body[k]);
    if (d === "invalid") return { error: `Invalid ${k === "startAt" ? "start" : "end"} date` };
    if (d !== undefined) out[k] = d;
  }
  if (out.startAt && out.endAt && out.endAt <= out.startAt) return { error: "End date must be after the start date" };
  return { value: out };
}

// Public payload for the app's Home screen.
export async function getHomeContent(now = new Date()) {
  const [banners, announcement] = await Promise.all([
    AppBanner.find(liveQuery(now)).sort({ order: 1, createdAt: -1 }).limit(MAX_LIVE_BANNERS).lean(),
    AppAnnouncement.findOne(liveQuery(now)).sort({ startAt: -1, createdAt: -1 }).lean(),
  ]);
  // A scheduled update whose start time has now arrived: deliver it once
  // (atomic claim inside, so concurrent requests can't double-send).
  if (announcement && announcement.delivery?.status === "PENDING") {
    deliverAnnouncement(announcement._id).catch((e) => console.error("Announcement delivery error:", e));
  }
  return {
    banners: banners.map((b) => ({
      id: String(b._id),
      title: b.title,
      imageUrl: b.image?.url,
      width: b.image?.width || BANNER_WIDTH,
      height: b.image?.height || BANNER_HEIGHT,
      action: { type: b.action?.type || "NONE", screen: b.action?.screen || null, url: b.action?.url || null },
    })),
    announcement: announcement
      ? { id: String(announcement._id), headline: announcement.headline, message: announcement.message, createdAt: announcement.startAt || announcement.createdAt }
      : null,
  };
}

// Puts the update into every active rider's Notifications (and optionally
// sends a push). Runs once per announcement.
export async function deliverAnnouncement(id) {
  const claimed = await AppAnnouncement.findOneAndUpdate(
    { _id: id, "delivery.status": "PENDING" },
    { $set: { "delivery.status": "SENDING" } },
    { new: true }
  );
  if (!claimed) return null;
  if (!isLive(claimed)) {
    await AppAnnouncement.updateOne({ _id: id }, { $set: { "delivery.status": "PENDING" } });
    return null;
  }
  let notified = 0;
  const tokens = [];
  try {
    // A retry after a failure skips riders who already got it.
    const already = new Set(
      (await Notification.distinct("recipientId", { recipientType: "Rider", "data.announcementId": String(claimed._id) })).map(String)
    );
    notified = already.size;
    const cursor = RiderProfile.find({ isDeleted: { $ne: true }, isActive: { $ne: false } }).select("_id pushToken").lean().cursor();
    let batch = [];
    const flush = async () => {
      if (!batch.length) return;
      await Notification.insertMany(batch, { ordered: false });
      notified += batch.length;
      batch = [];
    };
    for await (const r of cursor) {
      if (already.has(String(r._id))) continue;
      batch.push({
        recipientType: "Rider",
        recipientId: r._id,
        title: claimed.headline,
        message: claimed.message,
        type: "System",
        data: { announcementId: String(claimed._id) },
      });
      if (claimed.sendPush && r.pushToken && Expo.isExpoPushToken(r.pushToken)) tokens.push(r.pushToken);
      if (batch.length >= 500) await flush();
    }
    await flush();

    let pushed = 0;
    if (claimed.sendPush && tokens.length) {
      const messages = [...new Set(tokens)].map((to) => ({
        to,
        sound: "default",
        title: claimed.headline,
        body: claimed.message.length > 170 ? `${claimed.message.slice(0, 167)}...` : claimed.message,
        data: { announcementId: String(claimed._id) },
      }));
      for (const chunk of expo.chunkPushNotifications(messages)) {
        try {
          const tickets = await expo.sendPushNotificationsAsync(chunk);
          pushed += tickets.filter((t) => t.status === "ok").length;
        } catch (e) {
          console.error("Announcement push chunk error:", e);
        }
      }
    }
    await AppAnnouncement.updateOne(
      { _id: id },
      { $set: { "delivery.status": "SENT", "delivery.notified": notified, "delivery.pushed": pushed, "delivery.sentAt": new Date() } }
    );
    return { notified, pushed };
  } catch (e) {
    await AppAnnouncement.updateOne({ _id: id }, { $set: { "delivery.status": "FAILED", "delivery.notified": notified, "delivery.error": String(e?.message || e).slice(0, 300) } });
    throw e;
  }
}
