import PartnerAuth from "../models/partner/PartnerAuth.js";
import PartnerActionLog from "../models/partner/PartnerActionLog.js";
import { uploadToR2 } from "./fileUpload.service.js";

// MBConnect partner account rules shared by auth, profile, dispatch and admin.

export const MAX_CODE_ATTEMPTS = 5;
export const MIN_PASSWORD_LENGTH = 6;
// Statuses that stop a partner using the app at all (checked on every request).
export const BLOCKED_STATUSES = ["Suspended", "Blacklisted", "Deleted"];

export const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));

// 10-digit Indian mobile (optionally +91 / 0 prefixed). "Not Provided" is not a number.
export function isValidMobile(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits);
}

// ---- Approval ----
// "Approved" is approved. "Active" is ambiguous: email verification also sets
// it, so it only counts when an admin status change to "Active" is on record
// (the admin "Active" action runs the same approval checks as "Approved").
export function isApprovedStatus(status, hasAdminActiveLog) {
  return status === "Approved" || (status === "Active" && !!hasAdminActiveLog);
}

export async function getApprovedAuthIdSet(authIds = []) {
  const ids = authIds.filter(Boolean);
  if (!ids.length) return new Set();
  const auths = await PartnerAuth.find({ _id: { $in: ids }, status: { $in: ["Approved", "Active"] } }).select("status").lean();
  const approved = new Set(auths.filter((a) => a.status === "Approved").map((a) => String(a._id)));
  const activeIds = auths.filter((a) => a.status === "Active").map((a) => a._id);
  if (activeIds.length) {
    const logs = await PartnerActionLog.find({ partnerId: { $in: activeIds }, actionType: "StatusChange", newStatus: "Active" })
      .select("partnerId")
      .lean();
    for (const log of logs) approved.add(String(log.partnerId));
  }
  return approved;
}

export async function isPartnerApproved(authId) {
  return (await getApprovedAuthIdSet([authId])).has(String(authId));
}

export const NOT_APPROVED_MESSAGE =
  "Your account isn't approved yet. Complete your profile and submit it for approval -- you can go online once our team approves it.";

// ---- Submission checklist (same list the app shows) ----
export function getSubmissionChecklist({ profile, address, bank, vehicles = [], drivers = [], documents = [], settings, financialEnabled }) {
  const liveDocs = documents.filter((d) => !["Archived", "Rejected", "Re-upload Required"].includes(d.status));
  const hasDoc = (type) => liveDocs.some((d) => d.documentType === type);
  const websiteCities = (settings?.vehicleConfigs || []).some((c) => (c.locations || []).some((l) => l?.city));
  const appCities = (profile?.pricingConfig?.locationsList || []).some((l) => l?.city);
  const items = [
    { key: "name", label: "Full name", done: !!String(profile?.fullName || "").trim() },
    { key: "mobile", label: "Valid mobile number", done: isValidMobile(profile?.mobileNumber) },
    { key: "address", label: "Address", done: !!(address?.city && address?.state) },
    { key: "aadhaar", label: "Aadhaar card", done: hasDoc("Aadhaar") },
    { key: "pan", label: "PAN card", done: hasDoc("PAN") },
    { key: "photo", label: "Profile photo", done: !!profile?.profilePicture },
    ...(financialEnabled ? [{ key: "bank", label: "Bank account", done: !!bank?.accountNumber }] : []),
    { key: "vehicle", label: "At least one vehicle", done: vehicles.length > 0 },
    { key: "driver", label: "At least one driver", done: drivers.length > 0 },
    { key: "serviceArea", label: "Service area (city you work in)", done: websiteCities || appCities },
  ];
  return items;
}

// ---- Images: keep files in storage, not inside the database ----
// The app sends photos as base64 data URLs; store them in R2 and keep the CDN
// URL. Anything else (already a URL) is returned unchanged. If the upload
// fails the original value is kept, so saving never breaks.
export async function storeImageIfDataUrl(value, folder = "partner-docs") {
  if (typeof value !== "string" || !value.startsWith("data:image/")) return value;
  const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return value;
  try {
    const buffer = Buffer.from(match[2], "base64");
    if (!buffer.length) return value;
    return await uploadToR2(buffer, folder, match[1]);
  } catch (error) {
    console.error("Partner image upload to storage failed, keeping inline copy:", error.message);
    return value;
  }
}
