import crypto from "crypto";
import mongoose from "mongoose";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerAddress from "../../models/partner/PartnerAddress.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerDocument from "../../models/partner/PartnerDocument.js";
import PartnerActionLog from "../../models/partner/PartnerActionLog.js";
import { PartnerSettings } from "../../models/partner/PartnerSettings.js";
import { Staff } from "../../models/Staff.js";
import sendEmail from "../../services/email.service.js";
import { notifyUser } from "../../services/notification/notificationService.js";
import { normalizeEmail, isValidEmail, isValidMobile, storeImageIfDataUrl } from "../../services/partnerAccount.service.js";

// Admin: edit every part of a partner account (/api/admin/partner-edit).
// Separate from the partner app's own endpoints and from the older
// PUT /admin/partner-verification/:id/profile, which are left unchanged.
//
// Rules for every save:
//  - validated like the app validates the same data
//  - optional `expectedUpdatedAt`: if someone else saved in between -> 409
//  - key fields (bank account/IFSC/holder, vehicle registration/category,
//    driver licence) on an already-verified item send it back to pending
//    verification, unless the admin ticks `keepVerified`
//  - every change is written to the partner's Activity (who, what, old -> new)
//  - the partner is notified (unless `notifyPartner` is false)

const PARTNER_TYPES = ["Individual", "Fleet Owner", "Travel Agency", "Company"];
const GENDERS = ["Male", "Female", "Other"];
const IFSC_RX = /^[A-Z]{4}0[A-Z0-9]{6}$/;

const isId = (id) => mongoose.isValidObjectId(id);
const str = (v, max = 200) => (v === undefined ? undefined : v === null ? "" : String(v).trim().slice(0, max));
const digits = (v) => String(v || "").replace(/\D/g, "");
const mask = (v) => (v ? `••${String(v).slice(-4)}` : "—");
const SENSITIVE = new Set(["accountNumber", "aadhaarNumber", "chassisNumber", "engineNumber"]);
const show = (field, v) => {
  if (v === undefined || v === null || v === "") return "—";
  if (SENSITIVE.has(field)) return mask(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^(https?:|data:)/.test(v)) return "(file)";
  if (Array.isArray(v)) return v.join(", ") || "—";
  return String(v).slice(0, 80);
};
const same = (a, b) => {
  const n = (v) => (v instanceof Date ? v.toISOString() : Array.isArray(v) ? JSON.stringify(v) : v ?? "");
  return String(n(a)) === String(n(b));
};

const staffOf = async (req) => {
  let name = req.user?.name;
  if (!name) {
    try {
      name = (await Staff.findById(req.user?.sub).select("name").lean())?.name;
    } catch {}
  }
  return { id: isId(req.user?.sub) ? req.user.sub : undefined, name: name || "Admin" };
};
const fail = (res, e, label) => {
  if (e?.code === 11000) return res.status(400).json({ success: false, message: "That value is already used by another account." });
  if (e?.name === "ValidationError") return res.status(400).json({ success: false, message: Object.values(e.errors).map((x) => x.message).join(", ") });
  console.error(`Admin partner edit (${label}) error:`, e.message);
  return res.status(500).json({ success: false, message: "Server Error" });
};
// 409 when the record changed since the admin opened it.
const stale = (doc, expected) => !!expected && !!doc?.updatedAt && new Date(doc.updatedAt).getTime() !== new Date(expected).getTime();
const STALE = { success: false, code: "STALE", message: "Someone else changed this just now. Reload the partner and try again." };

// Applies `input` keys to `doc` (only listed fields), returns the change list.
function applyFields(doc, input, fields) {
  const changes = [];
  for (const f of fields) {
    if (input[f] === undefined) continue;
    if (!same(doc[f], input[f])) {
      changes.push({ field: f, from: doc[f], to: input[f] });
      doc[f] = input[f];
    }
  }
  return changes;
}

async function record(authId, staff, section, changes, extra = "") {
  if (!changes.length && !extra) return;
  const text = `${staff.name} edited ${section}: ${changes.map((c) => `${c.field} ${show(c.field, c.from)} → ${show(c.field, c.to)}`).join("; ")}${extra ? `${changes.length ? " · " : ""}${extra}` : ""}`;
  await PartnerActionLog.create({ partnerId: authId, adminId: staff.id, actionType: "SystemUpdate", newStatus: "AdminEdit", comment: text.slice(0, 2000) });
}

async function tellPartner(authId, req, title, message) {
  if (req.body?.notifyPartner === false) return;
  try {
    const p = await PartnerProfile.findOne({ authId }).select("_id pushToken").lean();
    if (!p) return;
    await notifyUser({ recipientType: "Partner", recipientId: p._id, title, message, type: "Document", data: { screen: "PersonalDetails" }, pushToken: p.pushToken });
  } catch (e) {
    console.error("Partner edit notification error:", e.message);
  }
}

async function loadAccount(authId) {
  if (!isId(authId)) return {};
  const auth = await PartnerAuth.findById(authId);
  if (!auth || auth.status === "Deleted") return { auth: null };
  const profile = await PartnerProfile.findOne({ authId });
  return { auth, profile };
}
const NOT_FOUND = { success: false, message: "Partner not found (or deleted — restore it first)." };
const NO_PROFILE = { success: false, message: "Fill the partner's profile (name and type) first." };

// ---------------- Profile + address ----------------

// PUT /:authId/profile
export const editProfile = async (req, res) => {
  try {
    const { auth, profile: existing } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    const b = req.body || {};
    if (stale(existing, b.expectedUpdatedAt)) return res.status(409).json(STALE);

    const input = {
      fullName: str(b.fullName, 120),
      fatherName: str(b.fatherName, 120),
      gender: b.gender === undefined ? undefined : b.gender || undefined,
      partnerType: str(b.partnerType, 40),
      agencyName: str(b.agencyName, 160),
      mobileNumber: b.mobileNumber === undefined ? undefined : digits(b.mobileNumber).slice(-10),
      alternateMobileNumber: b.alternateMobileNumber === undefined ? undefined : digits(b.alternateMobileNumber).slice(-10),
      whatsappNumber: b.whatsappNumber === undefined ? undefined : digits(b.whatsappNumber).slice(-10),
      emergencyContactName: str(b.emergencyContactName, 120),
      emergencyContactNumber: b.emergencyContactNumber === undefined ? undefined : digits(b.emergencyContactNumber).slice(-10),
      preferredLanguage: str(b.preferredLanguage, 40),
    };
    if (b.dob !== undefined) {
      if (!b.dob) input.dob = null;
      else {
        const d = new Date(b.dob);
        if (isNaN(d) || d > new Date() || d.getFullYear() < 1920) return res.status(400).json({ success: false, message: "Enter a valid date of birth." });
        input.dob = d;
      }
    }
    // Validation (same rules as the app).
    const name = input.fullName ?? existing?.fullName;
    const type = input.partnerType ?? existing?.partnerType;
    if (!name) return res.status(400).json({ success: false, message: "Full name is required." });
    if (!PARTNER_TYPES.includes(type)) return res.status(400).json({ success: false, message: `Partner type must be one of: ${PARTNER_TYPES.join(", ")}.` });
    if (type !== "Individual" && !(input.agencyName ?? existing?.agencyName)) return res.status(400).json({ success: false, message: "Agency / company name is required for this partner type." });
    if (input.gender && !GENDERS.includes(input.gender)) return res.status(400).json({ success: false, message: "Gender must be Male, Female or Other." });
    for (const [k, label] of [["mobileNumber", "Mobile number"], ["alternateMobileNumber", "Alternate mobile"], ["whatsappNumber", "WhatsApp number"], ["emergencyContactNumber", "Emergency contact number"]]) {
      if (input[k] && !isValidMobile(input[k])) return res.status(400).json({ success: false, message: `${label} must be a valid 10-digit Indian mobile number.` });
    }

    const staff = await staffOf(req);
    let profile = existing;
    const changes = [];
    if (!profile) {
      profile = new PartnerProfile({ authId: auth._id, fullName: name, partnerType: type });
      changes.push({ field: "profile", from: "", to: "created" });
    }
    changes.push(...applyFields(profile, input, Object.keys(input)));
    if (b.profilePicture !== undefined) {
      const url = b.profilePicture ? await storeImageIfDataUrl(b.profilePicture, "partner-profile") : "";
      if (!same(profile.profilePicture, url)) {
        changes.push({ field: "profilePicture", from: profile.profilePicture, to: url });
        profile.profilePicture = url;
      }
    }
    await profile.save();

    // Address: created if missing (needs the required fields), else updated.
    if (b.address && typeof b.address === "object") {
      const a = {
        addressLine: str(b.address.addressLine, 300),
        city: str(b.address.city, 80),
        district: str(b.address.district, 80),
        state: str(b.address.state, 80),
        pincode: b.address.pincode === undefined ? undefined : digits(b.address.pincode),
      };
      if (a.pincode && !/^[1-9]\d{5}$/.test(a.pincode)) return res.status(400).json({ success: false, message: "PIN code must be 6 digits." });
      let address = await PartnerAddress.findOne({ partnerId: profile._id });
      if (!address) {
        if (!a.addressLine || !a.city || !a.state || !a.pincode) {
          return res.status(400).json({ success: false, message: "To add an address, fill address line, city, state and PIN code." });
        }
        address = new PartnerAddress({ partnerId: profile._id, type: "Permanent" });
        changes.push({ field: "address", from: "", to: "created" });
      }
      for (const k of ["addressLine", "city", "state"]) if (a[k] === "") return res.status(400).json({ success: false, message: `Address ${k === "addressLine" ? "line" : k} can't be empty.` });
      changes.push(...applyFields(address, a, Object.keys(a)).map((c) => ({ ...c, field: `address.${c.field}` })));
      await address.save();
    }
    await record(auth._id, staff, "Profile", changes);
    if (changes.length) await tellPartner(auth._id, req, "Profile updated", "MBConnect updated your profile details. Open Personal Details to review them.");
    return res.json({ success: true, message: changes.length ? "Profile saved." : "No changes.", changes: changes.length });
  } catch (e) {
    return fail(res, e, "profile");
  }
};

// ---------------- Bank ----------------

// PUT /:authId/bank
export const editBank = async (req, res) => {
  try {
    const { auth, profile } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    if (!profile) return res.status(400).json(NO_PROFILE);
    const b = req.body || {};
    let bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true });
    if (stale(bank, b.expectedUpdatedAt)) return res.status(409).json(STALE);
    const input = {
      accountHolderName: str(b.accountHolderName, 120),
      bankName: str(b.bankName, 120),
      branchName: str(b.branchName, 120),
      accountNumber: b.accountNumber === undefined ? undefined : digits(b.accountNumber),
      ifsc: b.ifsc === undefined ? undefined : String(b.ifsc).trim().toUpperCase(),
      upiId: str(b.upiId, 100),
    };
    const next = { ...(bank?.toObject?.() || {}), ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) };
    if (!next.accountHolderName || !next.bankName || !next.accountNumber || !next.ifsc) return res.status(400).json({ success: false, message: "Account holder, bank name, account number and IFSC are required." });
    if (!/^\d{9,18}$/.test(next.accountNumber)) return res.status(400).json({ success: false, message: "Account number must be 9–18 digits." });
    if (!IFSC_RX.test(next.ifsc)) return res.status(400).json({ success: false, message: "IFSC must look like HDFC0001234." });
    if (next.upiId && !/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(next.upiId)) return res.status(400).json({ success: false, message: "Enter a valid UPI ID (e.g. name@okhdfcbank)." });

    const staff = await staffOf(req);
    const changes = [];
    if (!bank) {
      bank = new PartnerBank({ partnerId: profile._id, isPrimary: true, status: "Pending" });
      changes.push({ field: "bank", from: "", to: "created" });
    }
    const keyChanged = ["accountNumber", "ifsc", "accountHolderName"].some((k) => input[k] !== undefined && !same(bank[k], input[k]));
    changes.push(...applyFields(bank, input, Object.keys(input)));
    if (b.cancelledChequeUrl !== undefined) {
      const url = b.cancelledChequeUrl ? await storeImageIfDataUrl(b.cancelledChequeUrl, "partner-docs") : "";
      if (!same(bank.cancelledChequeUrl, url)) {
        changes.push({ field: "cancelledCheque", from: bank.cancelledChequeUrl, to: url });
        bank.cancelledChequeUrl = url;
      }
    }
    let extra = "";
    if (bank.status === "Verified" && keyChanged && !b.keepVerified) {
      bank.status = "Pending";
      extra = "bank sent back to Pending verification";
    } else if (bank.status === "Verified" && keyChanged) extra = "kept Verified by admin";
    await bank.save();
    await record(auth._id, staff, "Bank", changes, extra);
    if (changes.length) await tellPartner(auth._id, req, "Bank details updated", "MBConnect updated your bank details. Open Payout & Bank Details to review them.");
    return res.json({ success: true, message: changes.length ? `Bank saved${extra ? ` (${extra})` : ""}.` : "No changes.", status: bank.status });
  } catch (e) {
    return fail(res, e, "bank");
  }
};

// ---------------- Vehicles ----------------

const VEHICLE_FIELDS = ["category", "seatingCapacity", "brand", "model", "vehicleName", "registrationNumber", "chassisNumber", "engineNumber", "manufacturingYear", "color", "features"];
function vehicleInput(b) {
  const out = {};
  for (const f of ["category", "brand", "model", "vehicleName", "chassisNumber", "engineNumber", "color"]) if (b[f] !== undefined) out[f] = str(b[f], 80);
  if (b.registrationNumber !== undefined) out.registrationNumber = String(b.registrationNumber).replace(/\s+/g, "").toUpperCase().slice(0, 15);
  if (b.seatingCapacity !== undefined) out.seatingCapacity = Math.round(Number(b.seatingCapacity));
  if (b.manufacturingYear !== undefined) out.manufacturingYear = b.manufacturingYear === "" ? undefined : Math.round(Number(b.manufacturingYear));
  if (b.features !== undefined) out.features = (Array.isArray(b.features) ? b.features : String(b.features).split(",")).map((x) => String(x).trim()).filter(Boolean).slice(0, 30);
  return out;
}
function vehicleError(v) {
  if (!v.registrationNumber || !v.brand || !v.model || !v.vehicleName || !v.category) return "Registration number, category, brand, model and vehicle name are required.";
  if (!/^[A-Z0-9]{6,15}$/.test(v.registrationNumber)) return "Registration number looks wrong (e.g. DL01AB1234).";
  if (!Number.isFinite(v.seatingCapacity) || v.seatingCapacity < 1 || v.seatingCapacity > 60) return "Seats must be between 1 and 60.";
  if (v.manufacturingYear !== undefined && v.manufacturingYear !== null && (v.manufacturingYear < 1980 || v.manufacturingYear > new Date().getFullYear() + 1)) return "Enter a valid manufacturing year.";
  return "";
}

// POST /:authId/vehicles
export const addVehicle = async (req, res) => {
  try {
    const { auth, profile } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    if (!profile) return res.status(400).json(NO_PROFILE);
    const input = vehicleInput(req.body || {});
    const err = vehicleError(input);
    if (err) return res.status(400).json({ success: false, message: err });
    if (await PartnerVehicle.exists({ registrationNumber: input.registrationNumber })) return res.status(400).json({ success: false, message: "A vehicle with this registration number already exists." });
    let assignedDriverId;
    if (req.body?.assignedDriverId) {
      if (!(await PartnerDriver.exists({ _id: req.body.assignedDriverId, partnerId: profile._id, isDeleted: false }))) return res.status(400).json({ success: false, message: "Pick a driver from this partner's roster." });
      assignedDriverId = req.body.assignedDriverId;
    }
    const v = await PartnerVehicle.create({ ...input, partnerId: profile._id, assignedDriverId, status: req.body?.markVerified ? "Active" : "Pending Approval" });
    const staff = await staffOf(req);
    await record(auth._id, staff, "Vehicles", [], `added vehicle ${v.registrationNumber} (${v.category})${v.status === "Active" ? " · marked verified" : " · pending verification"}`);
    await tellPartner(auth._id, req, "Vehicle added", `MBConnect added vehicle ${v.registrationNumber} to your account.`);
    return res.status(201).json({ success: true, message: "Vehicle added.", data: v });
  } catch (e) {
    return fail(res, e, "add vehicle");
  }
};

async function ownedVehicle(id) {
  if (!isId(id)) return {};
  const v = await PartnerVehicle.findOne({ _id: id, isDeleted: false });
  if (!v) return {};
  const profile = await PartnerProfile.findById(v.partnerId);
  return { v, profile };
}

// PUT /vehicles/:vehicleId
export const editVehicle = async (req, res) => {
  try {
    const { v, profile } = await ownedVehicle(req.params.vehicleId);
    if (!v || !profile) return res.status(404).json({ success: false, message: "Vehicle not found." });
    const b = req.body || {};
    if (stale(v, b.expectedUpdatedAt)) return res.status(409).json(STALE);
    const input = vehicleInput(b);
    const err = vehicleError({ ...v.toObject(), ...input });
    if (err) return res.status(400).json({ success: false, message: err });
    if (input.registrationNumber && input.registrationNumber !== v.registrationNumber && (await PartnerVehicle.exists({ registrationNumber: input.registrationNumber, _id: { $ne: v._id } }))) {
      return res.status(400).json({ success: false, message: "Another vehicle already has this registration number." });
    }
    const keyChanged = ["registrationNumber", "category"].some((k) => input[k] !== undefined && !same(v[k], input[k]));
    const changes = applyFields(v, input, VEHICLE_FIELDS);
    if (b.assignedDriverId !== undefined) {
      const to = b.assignedDriverId || null;
      if (to && !(await PartnerDriver.exists({ _id: to, partnerId: profile._id, isDeleted: false }))) return res.status(400).json({ success: false, message: "Pick a driver from this partner's roster." });
      if (!same(v.assignedDriverId, to)) {
        changes.push({ field: "assignedDriver", from: v.assignedDriverId, to });
        v.assignedDriverId = to;
      }
    }
    let extra = "";
    if (v.status === "Active" && keyChanged && !b.keepVerified) {
      v.status = "Pending Approval";
      extra = "vehicle sent back to Pending verification";
    } else if (v.status === "Active" && keyChanged) extra = "kept Verified by admin";
    await v.save();
    const staff = await staffOf(req);
    await record(profile.authId, staff, `Vehicle ${v.registrationNumber}`, changes, extra);
    if (changes.length) await tellPartner(profile.authId, req, "Vehicle details updated", `MBConnect updated vehicle ${v.registrationNumber}.`);
    return res.json({ success: true, message: changes.length ? `Vehicle saved${extra ? ` (${extra})` : ""}.` : "No changes.", status: v.status });
  } catch (e) {
    return fail(res, e, "edit vehicle");
  }
};

// DELETE /vehicles/:vehicleId  { reason }
export const removeVehicle = async (req, res) => {
  try {
    const { v, profile } = await ownedVehicle(req.params.vehicleId);
    if (!v || !profile) return res.status(404).json({ success: false, message: "Vehicle not found." });
    const reason = str(req.body?.reason, 300);
    if (!reason) return res.status(400).json({ success: false, message: "Add a reason for removing the vehicle." });
    // Same soft delete the app uses: the vehicle and its history are kept.
    v.isDeleted = true;
    await v.save();
    const staff = await staffOf(req);
    await record(profile.authId, staff, "Vehicles", [], `removed vehicle ${v.registrationNumber} — ${reason}`);
    await tellPartner(profile.authId, req, "Vehicle removed", `MBConnect removed vehicle ${v.registrationNumber} from your account: ${reason}`);
    return res.json({ success: true, message: "Vehicle removed." });
  } catch (e) {
    return fail(res, e, "remove vehicle");
  }
};

// ---------------- Drivers ----------------

const DRIVER_FIELDS = ["name", "mobile", "alternateMobile", "aadhaarNumber", "licenceNumber", "licenceExpiry", "experienceYears", "languagesKnown"];
function driverInput(b) {
  const out = {};
  if (b.name !== undefined) out.name = str(b.name, 120);
  if (b.mobile !== undefined) out.mobile = digits(b.mobile).slice(-10);
  if (b.alternateMobile !== undefined) out.alternateMobile = digits(b.alternateMobile).slice(-10);
  if (b.aadhaarNumber !== undefined) out.aadhaarNumber = digits(b.aadhaarNumber);
  if (b.licenceNumber !== undefined) out.licenceNumber = String(b.licenceNumber).replace(/\s+/g, "").toUpperCase().slice(0, 20);
  if (b.licenceExpiry !== undefined) out.licenceExpiry = b.licenceExpiry ? new Date(b.licenceExpiry) : null;
  if (b.experienceYears !== undefined) out.experienceYears = b.experienceYears === "" ? undefined : Math.round(Number(b.experienceYears));
  if (b.languagesKnown !== undefined) out.languagesKnown = (Array.isArray(b.languagesKnown) ? b.languagesKnown : String(b.languagesKnown).split(",")).map((x) => String(x).trim()).filter(Boolean).slice(0, 10);
  return out;
}
function driverError(d) {
  if (!d.name || !d.mobile || !d.licenceNumber) return "Driver name, mobile and licence number are required.";
  if (!isValidMobile(d.mobile)) return "Driver mobile must be a valid 10-digit Indian mobile number.";
  if (d.alternateMobile && !isValidMobile(d.alternateMobile)) return "Alternate mobile must be a valid 10-digit number.";
  if (d.aadhaarNumber && !/^\d{12}$/.test(d.aadhaarNumber)) return "Aadhaar number must be 12 digits.";
  if (!/^[A-Z0-9-]{8,20}$/.test(d.licenceNumber)) return "Licence number looks wrong.";
  if (d.licenceExpiry && isNaN(new Date(d.licenceExpiry))) return "Enter a valid licence expiry date.";
  if (d.experienceYears !== undefined && d.experienceYears !== null && (d.experienceYears < 0 || d.experienceYears > 60)) return "Experience must be 0–60 years.";
  return "";
}

// POST /:authId/drivers
export const addDriver = async (req, res) => {
  try {
    const { auth, profile } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    if (!profile) return res.status(400).json(NO_PROFILE);
    const input = driverInput(req.body || {});
    const err = driverError(input);
    if (err) return res.status(400).json({ success: false, message: err });
    if (await PartnerDriver.exists({ licenceNumber: input.licenceNumber })) return res.status(400).json({ success: false, message: "A driver with this licence number already exists." });
    const d = await PartnerDriver.create({ ...input, partnerId: profile._id, status: req.body?.markVerified ? "Active" : "Pending" });
    const staff = await staffOf(req);
    await record(auth._id, staff, "Drivers", [], `added driver ${d.name} (${d.licenceNumber})${d.status === "Active" ? " · marked verified" : " · pending verification"}`);
    await tellPartner(auth._id, req, "Driver added", `MBConnect added driver ${d.name} to your account.`);
    return res.status(201).json({ success: true, message: "Driver added.", data: d });
  } catch (e) {
    return fail(res, e, "add driver");
  }
};

async function ownedDriver(id) {
  if (!isId(id)) return {};
  const d = await PartnerDriver.findOne({ _id: id, isDeleted: false });
  if (!d) return {};
  const profile = await PartnerProfile.findById(d.partnerId);
  return { d, profile };
}

// PUT /drivers/:driverId
export const editDriver = async (req, res) => {
  try {
    const { d, profile } = await ownedDriver(req.params.driverId);
    if (!d || !profile) return res.status(404).json({ success: false, message: "Driver not found." });
    const b = req.body || {};
    if (stale(d, b.expectedUpdatedAt)) return res.status(409).json(STALE);
    const input = driverInput(b);
    const err = driverError({ ...d.toObject(), ...input });
    if (err) return res.status(400).json({ success: false, message: err });
    if (input.licenceNumber && input.licenceNumber !== d.licenceNumber && (await PartnerDriver.exists({ licenceNumber: input.licenceNumber, _id: { $ne: d._id } }))) {
      return res.status(400).json({ success: false, message: "Another driver already has this licence number." });
    }
    const keyChanged = input.licenceNumber !== undefined && !same(d.licenceNumber, input.licenceNumber);
    const changes = applyFields(d, input, DRIVER_FIELDS);
    let extra = "";
    if (d.status === "Active" && keyChanged && !b.keepVerified) {
      d.status = "Pending";
      extra = "driver sent back to Pending verification";
    } else if (d.status === "Active" && keyChanged) extra = "kept Verified by admin";
    await d.save();
    const staff = await staffOf(req);
    await record(profile.authId, staff, `Driver ${d.name}`, changes, extra);
    if (changes.length) await tellPartner(profile.authId, req, "Driver details updated", `MBConnect updated driver ${d.name}.`);
    return res.json({ success: true, message: changes.length ? `Driver saved${extra ? ` (${extra})` : ""}.` : "No changes.", status: d.status });
  } catch (e) {
    return fail(res, e, "edit driver");
  }
};

// DELETE /drivers/:driverId  { reason }
export const removeDriver = async (req, res) => {
  try {
    const { d, profile } = await ownedDriver(req.params.driverId);
    if (!d || !profile) return res.status(404).json({ success: false, message: "Driver not found." });
    const reason = str(req.body?.reason, 300);
    if (!reason) return res.status(400).json({ success: false, message: "Add a reason for removing the driver." });
    if (await PartnerVehicle.exists({ assignedDriverId: d._id, isDeleted: false })) {
      return res.status(400).json({ success: false, message: "This driver is assigned to a vehicle. Assign another driver to that vehicle first." });
    }
    d.isDeleted = true;
    await d.save();
    const staff = await staffOf(req);
    await record(profile.authId, staff, "Drivers", [], `removed driver ${d.name} — ${reason}`);
    await tellPartner(profile.authId, req, "Driver removed", `MBConnect removed driver ${d.name} from your account: ${reason}`);
    return res.json({ success: true, message: "Driver removed." });
  } catch (e) {
    return fail(res, e, "remove driver");
  }
};

// ---------------- Documents ----------------

// POST /:authId/documents  { ownerType, ownerId, documentType, fileUrl, fileUrlBack?, expiryDate?, markVerified? }
// Upload / replace on the partner's behalf. The previous version is archived (kept).
export const uploadDocument = async (req, res) => {
  try {
    const { auth, profile } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    if (!profile) return res.status(400).json(NO_PROFILE);
    const b = req.body || {};
    const documentType = str(b.documentType, 60);
    if (!["PartnerProfile", "PartnerVehicle", "PartnerDriver"].includes(b.ownerType) || !documentType || !b.fileUrl) {
      return res.status(400).json({ success: false, message: "Choose what the document is for, its type, and a file." });
    }
    const owns =
      b.ownerType === "PartnerProfile"
        ? String(b.ownerId) === String(profile._id)
        : b.ownerType === "PartnerVehicle"
          ? !!(await PartnerVehicle.exists({ _id: b.ownerId, partnerId: profile._id, isDeleted: false }))
          : !!(await PartnerDriver.exists({ _id: b.ownerId, partnerId: profile._id, isDeleted: false }));
    if (!owns) return res.status(400).json({ success: false, message: "That vehicle / driver doesn't belong to this partner." });
    let expiryDate;
    if (b.expiryDate) {
      expiryDate = new Date(b.expiryDate);
      if (isNaN(expiryDate)) return res.status(400).json({ success: false, message: "Enter a valid expiry date." });
    }
    const fileUrl = await storeImageIfDataUrl(b.fileUrl, "partner-docs");
    const fileUrlBack = b.fileUrlBack ? await storeImageIfDataUrl(b.fileUrlBack, "partner-docs") : undefined;
    const staff = await staffOf(req);
    const old = await PartnerDocument.findOne({ ownerType: b.ownerType, ownerId: b.ownerId, documentType, status: { $ne: "Archived" } });
    if (old) {
      old.status = "Archived";
      old.remarks = `Replaced by ${staff.name}`;
      await old.save();
    }
    const doc = await PartnerDocument.create({
      ownerType: b.ownerType,
      ownerId: b.ownerId,
      documentType,
      fileUrl,
      ...(fileUrlBack ? { fileUrlBack } : {}),
      ...(expiryDate ? { expiryDate } : {}),
      status: b.markVerified ? "Approved" : "Pending",
      ...(b.markVerified ? { verificationDate: new Date(), remarks: `Uploaded and verified by ${staff.name}` } : { remarks: `Uploaded by ${staff.name}` }),
    });
    await record(auth._id, staff, "Documents", [], `${old ? "replaced" : "uploaded"} ${documentType}${doc.status === "Approved" ? " · marked verified" : " · pending verification"}`);
    await tellPartner(auth._id, req, "Document updated", `MBConnect ${old ? "replaced" : "uploaded"} your ${documentType} document.`);
    return res.status(201).json({ success: true, message: `${documentType} ${old ? "replaced" : "uploaded"}.`, data: doc });
  } catch (e) {
    return fail(res, e, "upload document");
  }
};

// PUT /documents/:documentId  { expiryDate }
export const editDocument = async (req, res) => {
  try {
    if (!isId(req.params.documentId)) return res.status(404).json({ success: false, message: "Document not found." });
    const doc = await PartnerDocument.findById(req.params.documentId);
    if (!doc || doc.status === "Archived") return res.status(404).json({ success: false, message: "Document not found." });
    const profile =
      doc.ownerType === "PartnerProfile"
        ? await PartnerProfile.findById(doc.ownerId)
        : doc.ownerType === "PartnerVehicle"
          ? await PartnerProfile.findById((await PartnerVehicle.findById(doc.ownerId).select("partnerId").lean())?.partnerId)
          : await PartnerProfile.findById((await PartnerDriver.findById(doc.ownerId).select("partnerId").lean())?.partnerId);
    if (!profile) return res.status(404).json({ success: false, message: "Document owner not found." });
    const b = req.body || {};
    const to = b.expiryDate ? new Date(b.expiryDate) : null;
    if (b.expiryDate && isNaN(to)) return res.status(400).json({ success: false, message: "Enter a valid expiry date." });
    const changes = applyFields(doc, { expiryDate: to }, ["expiryDate"]);
    await doc.save();
    await record(profile.authId, await staffOf(req), `Document ${doc.documentType}`, changes);
    return res.json({ success: true, message: changes.length ? "Expiry date saved." : "No changes." });
  } catch (e) {
    return fail(res, e, "edit document");
  }
};

// ---------------- Login ----------------

// PUT /:authId/email  { email }
export const changeEmail = async (req, res) => {
  try {
    const { auth } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) return res.status(400).json({ success: false, message: "Enter a valid email address." });
    if (email === auth.email) return res.json({ success: true, message: "No changes." });
    if (await PartnerAuth.exists({ email, _id: { $ne: auth._id } })) return res.status(400).json({ success: false, message: "Another partner account already uses this email." });
    const from = auth.email;
    auth.email = email;
    auth.isEmailVerified = true; // admin confirmed the address
    await auth.save();
    await record(auth._id, await staffOf(req), "Login", [{ field: "email", from, to: email }]);
    await tellPartner(auth._id, req, "Login email changed", `Your MBConnect login email is now ${email}. Use it next time you sign in.`);
    return res.json({ success: true, message: "Email changed. The partner signs in with the new email from now on." });
  } catch (e) {
    return fail(res, e, "email");
  }
};

// POST /:authId/password-reset  -- emails a reset code (same as the app's Forgot Password)
export const sendPasswordReset = async (req, res) => {
  try {
    const { auth } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    const code = (100000 + crypto.randomInt(900000)).toString();
    auth.resetPasswordToken = code;
    auth.resetPasswordExpiry = new Date(Date.now() + 15 * 60 * 1000);
    auth.resetPasswordAttempts = 0;
    await auth.save();
    await sendEmail(
      auth.email,
      "Partner Password Reset Request",
      `<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
        <h2>Reset Your Password</h2>
        <p>MBConnect support started a password reset for your account. Use this OTP in the app (Forgot Password):</p>
        <h1 style="color: #FE5300; letter-spacing: 5px;">${code}</h1>
        <p>This OTP will expire in 15 minutes.</p>
      </div>`
    );
    await record(auth._id, await staffOf(req), "Login", [], "sent a password reset code to the partner's email");
    return res.json({ success: true, message: `Reset code sent to ${auth.email}. The partner enters it in Forgot Password.` });
  } catch (e) {
    return fail(res, e, "password reset");
  }
};

// POST /:authId/unlink-google
export const unlinkGoogle = async (req, res) => {
  try {
    const { auth } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    if (!auth.googleId) return res.status(400).json({ success: false, message: "This account isn't linked to Google." });
    auth.googleId = undefined;
    auth.authProviders = (auth.authProviders || []).filter((p) => p !== "google");
    await auth.save();
    await record(auth._id, await staffOf(req), "Login", [], "unlinked Google sign-in (partner now signs in with email + password; use Forgot Password if needed)");
    return res.json({ success: true, message: "Google unlinked." });
  } catch (e) {
    return fail(res, e, "unlink google");
  }
};

// ---------------- Work locations & rates (Settings) ----------------

// PUT /:authId/settings  { vehicleConfigs: [{ vehicleId, perKmRate, fullDayRate, locations: [{ city, state, address?, pincode? }] }] }
export const editSettings = async (req, res) => {
  try {
    const { auth, profile } = await loadAccount(req.params.authId);
    if (!auth) return res.status(404).json(NOT_FOUND);
    if (!profile) return res.status(400).json(NO_PROFILE);
    const list = Array.isArray(req.body?.vehicleConfigs) ? req.body.vehicleConfigs : null;
    if (!list) return res.status(400).json({ success: false, message: "Nothing to save." });
    const vehicles = await PartnerVehicle.find({ partnerId: profile._id, isDeleted: false }).select("_id vehicleName registrationNumber").lean();
    const byId = new Map(vehicles.map((v) => [String(v._id), v]));
    const configs = [];
    for (const c of list) {
      const v = byId.get(String(c.vehicleId));
      if (!v) return res.status(400).json({ success: false, message: "A vehicle in the list doesn't belong to this partner." });
      const perKmRate = Number(c.perKmRate), fullDayRate = Number(c.fullDayRate);
      if (!Number.isFinite(perKmRate) || perKmRate < 0 || !Number.isFinite(fullDayRate) || fullDayRate < 0) return res.status(400).json({ success: false, message: `Enter valid rates for ${v.registrationNumber}.` });
      const locations = (Array.isArray(c.locations) ? c.locations : [])
        .map((l) => ({ city: str(l.city, 80), state: str(l.state, 80), address: str(l.address, 200), pincode: l.pincode ? digits(l.pincode) : undefined, country: "India" }))
        .filter((l) => l.city);
      if (locations.some((l) => !l.state)) return res.status(400).json({ success: false, message: `Add the state for every city of ${v.registrationNumber}.` });
      configs.push({ vehicleId: String(v._id), vehicleName: v.vehicleName, registrationNumber: v.registrationNumber, perKmRate, fullDayRate, locations });
    }
    const before = await PartnerSettings.findOne({ authId: auth._id }).lean();
    const summary = (arr) => (arr || []).map((c) => `${c.registrationNumber || c.vehicleName}: ₹${c.perKmRate}/km, ₹${c.fullDayRate}/day, ${(c.locations || []).map((l) => l.city).join("/") || "no city"}`).join(" | ");
    await PartnerSettings.findOneAndUpdate({ authId: auth._id }, { $set: { vehicleConfigs: configs } }, { upsert: true, new: true, setDefaultsOnInsert: true });
    const from = summary(before?.vehicleConfigs), to = summary(configs);
    if (from !== to) {
      await record(auth._id, await staffOf(req), "Work locations & rates", [], `${from || "none"} → ${to || "none"}`);
      await tellPartner(auth._id, req, "Work locations updated", "MBConnect updated your vehicles' work locations / rates. Open Service Area to review.");
    }
    return res.json({ success: true, message: from !== to ? "Work locations & rates saved." : "No changes." });
  } catch (e) {
    return fail(res, e, "settings");
  }
};
