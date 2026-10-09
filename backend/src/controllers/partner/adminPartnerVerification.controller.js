import mongoose from "mongoose";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDriver from "../../models/partner/PartnerDriver.js";
import PartnerDocument from "../../models/partner/PartnerDocument.js";
import PartnerAddress from "../../models/partner/PartnerAddress.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerActionLog from "../../models/partner/PartnerActionLog.js";
import { PartnerSettings } from "../../models/partner/PartnerSettings.js";
import sendEmail from "../../services/email.service.js";
import { notifyUser } from "../../services/notification/notificationService.js";
import { RideBooking } from "../../models/RideBooking.js";
import { Staff } from "../../models/Staff.js";

// Inline (often base64) image/file fields. The list view never shows them, so
// "lite" mode leaves them out at query level; the review panel loads them per
// partner from GET /:partnerId/details.
const LITE_PROFILE_EXCLUDE = "-profilePicture";
const LITE_VEHICLE_EXCLUDE =
  "-rcImageUrl -pucImageUrl -insuranceFileUrl -permitFileUrl -frontImageUrl -rearImageUrl -leftSideImageUrl -rightSideImageUrl -interiorImageUrl -otherImageUrl";
const LITE_DRIVER_EXCLUDE = "-licenceImageUrl -photoUrl";
const LITE_DOCUMENT_EXCLUDE = "-fileUrl";

// Builds the per-partner verification records (profile, bank, fleet, docs,
// stats) for the given PartnerAuth docs using batched queries.
const buildPartnerRecords = async (partners, { lite = false } = {}) => {
  // Batch-load every related collection once (instead of ~11 queries per
  // partner) and stitch the results together in memory. The response shape
  // and per-partner contents are the same as the old per-partner lookups.
  const authIds = partners.map((partner) => partner._id);

  const [profiles, settingsList] = await Promise.all([
    PartnerProfile.find({ authId: { $in: authIds } }).select(lite ? LITE_PROFILE_EXCLUDE : ""),
    PartnerSettings.find({ authId: { $in: authIds } }),
  ]);
  const profileIds = profiles.map((profile) => profile._id);

  const [addresses, banks, vehicles, drivers, vehicleCounts, profileDocs] = await Promise.all([
    PartnerAddress.find({ partnerId: { $in: profileIds } }),
    PartnerBank.find({ partnerId: { $in: profileIds }, isPrimary: true }),
    PartnerVehicle.find({ partnerId: { $in: profileIds }, isDeleted: false }).select(lite ? LITE_VEHICLE_EXCLUDE : ""),
    PartnerDriver.find({ partnerId: { $in: profileIds }, isDeleted: false }).select(lite ? LITE_DRIVER_EXCLUDE : ""),
    // Count includes soft-deleted vehicles, same as the previous countDocuments.
    PartnerVehicle.aggregate([
      { $match: { partnerId: { $in: profileIds } } },
      { $group: { _id: "$partnerId", count: { $sum: 1 } } },
    ]),
    PartnerDocument.find({
      ownerType: "PartnerProfile",
      ownerId: { $in: profileIds },
      status: { $ne: "Archived" },
    }).select(lite ? LITE_DOCUMENT_EXCLUDE : ""),
  ]);

  const [vehicleDocs, driverDocs] = await Promise.all([
    PartnerDocument.find({
      ownerType: "PartnerVehicle",
      ownerId: { $in: vehicles.map((vehicle) => vehicle._id) },
      status: { $ne: "Archived" },
    }).select(lite ? LITE_DOCUMENT_EXCLUDE : ""),
    PartnerDocument.find({
      ownerType: "PartnerDriver",
      ownerId: { $in: drivers.map((driver) => driver._id) },
      status: { $ne: "Archived" },
    }).select(lite ? LITE_DOCUMENT_EXCLUDE : ""),
  ]);

  const key = (id) => String(id);
  // findOne() semantics: keep the first match per key.
  const firstBy = (docs, field) => {
    const map = new Map();
    for (const doc of docs) {
      const k = key(doc[field]);
      if (!map.has(k)) map.set(k, doc);
    }
    return map;
  };
  const groupBy = (docs, field) => {
    const map = new Map();
    for (const doc of docs) {
      const k = key(doc[field]);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(doc);
    }
    return map;
  };

  const profileByAuth = firstBy(profiles, "authId");
  const settingsByAuth = firstBy(settingsList, "authId");
  const addressByProfile = firstBy(addresses, "partnerId");
  const bankByProfile = firstBy(banks, "partnerId");
  const vehiclesByProfile = groupBy(vehicles, "partnerId");
  const driversByProfile = groupBy(drivers, "partnerId");
  const profileDocsByOwner = groupBy(profileDocs, "ownerId");
  const vehicleCountByProfile = new Map(vehicleCounts.map((row) => [key(row._id), row.count]));

  return partners.map((partner) => {
    const authId = key(partner._id);
    const profile = profileByAuth.get(authId) || null;
    const settings = settingsByAuth.get(authId) || null;

    let vehicleCount = 0;
    let driverCount = 0;
    let profileDocuments = [];
    let vehicleDocuments = [];
    let driverDocuments = [];
    let pendingDocsCount = 0;
    let rejectedDocsCount = 0;

    let address = null;
    let bank = null;
    let vehiclesList = [];
    let driversList = [];

    if (profile) {
      const profileId = key(profile._id);
      address = addressByProfile.get(profileId) || null;
      bank = bankByProfile.get(profileId) || null;

      vehiclesList = vehiclesByProfile.get(profileId) || [];
      driversList = driversByProfile.get(profileId) || [];

      vehicleCount = vehicleCountByProfile.get(profileId) || 0;
      driverCount = driversList.length;

      profileDocuments = profileDocsByOwner.get(profileId) || [];
      // Filter (not regroup) to keep the same order the old $in query returned.
      const vehicleIdSet = new Set(vehiclesList.map((vehicle) => key(vehicle._id)));
      const driverIdSet = new Set(driversList.map((driver) => key(driver._id)));
      vehicleDocuments = vehicleDocs.filter((doc) => vehicleIdSet.has(key(doc.ownerId)));
      driverDocuments = driverDocs.filter((doc) => driverIdSet.has(key(doc.ownerId)));

      pendingDocsCount = profileDocuments.filter((doc) => doc.status === "Pending").length;
      rejectedDocsCount = profileDocuments.filter((doc) => doc.status === "Rejected").length;
    }

    return {
      auth: partner,
      profile: profile || null,
      address: address,
      bank: bank,
      settings: settings,
      vehicles: vehiclesList,
      drivers: driversList,
      stats: {
        vehicles: vehicleCount,
        drivers: driverCount,
        pendingDocuments: pendingDocsCount,
        rejectedDocuments: rejectedDocsCount,
      },
      documents: profileDocuments.concat(vehicleDocuments, driverDocuments),
      documentSummary: {
        profile: profileDocuments.length,
        vehicle: vehicleDocuments.length,
        driver: driverDocuments.length,
      },
    };
  });
};

// @route   GET /api/admin/partner-verification/pending
// @desc    Get all partners with their aggregated stats (vehicles, documents)
//          ?lite=true omits inline image/file fields (fast list view)
export const getPendingPartners = async (req, res) => {
  try {
    const { status, lite } = req.query;
    
    // Fetch partners based on status, default to all if not specified
    let filter = {};
    if (status) {
      filter.status = status;
    }

    const partners = await PartnerAuth.find(filter).select("-password -refreshToken -resetPasswordToken").sort({ createdAt: -1 });

    const aggregatedPartners = await buildPartnerRecords(partners, { lite: lite === "true" });

    return res.status(200).json({
      success: true,
      data: aggregatedPartners,
    });
  } catch (error) {
    console.error("Get Pending Partners Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/partner-verification/:partnerId/details
// @desc    Full verification record (including images/files) for one partner
export const getPartnerDetails = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const partner = await PartnerAuth.findById(partnerId).select("-password -refreshToken -resetPasswordToken");
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    const [record] = await buildPartnerRecords([partner]);

    return res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Get Partner Details Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/:partnerId/status
// @desc    Update partner status (Approved, Hold, Rejected, In-Active, Active, Blacklisted)
export const updatePartnerStatus = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { status, reasons, comment } = req.body;
    const adminId = req.user ? req.user.id : undefined;

    const validStatuses = ["Draft", "PendingVerification", "Approved", "Hold", "Rejected", "In-Active", "Active", "Blacklisted"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status provided." });
    }

    const partner = await PartnerAuth.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    if (partner.status === "Deleted") {
      return res.status(400).json({ success: false, message: "This partner is deleted. Restore the account before changing its status." });
    }

    const oldStatus = partner.status;
    // Enforce Master Approval Validation
    if (status === "Approved" || status === "Active") {
      const profile = await PartnerProfile.findOne({ authId: partnerId });
      if (!profile) {
        return res.status(400).json({ success: false, message: "Cannot approve account: Partner profile is missing." });
      }

      const documents = await PartnerDocument.find({ ownerId: profile._id });
      const hasPendingDocs = documents.some(doc => doc.status !== "Approved" && doc.status !== "Archived");
      if (hasPendingDocs) {
        return res.status(400).json({ success: false, message: "Cannot approve account: There are unverified or rejected documents." });
      }

      const bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true });
      if (!bank || bank.status !== "Verified") {
        return res.status(400).json({ success: false, message: "Cannot approve account: Bank information is not verified." });
      }

      const vehicles = await PartnerVehicle.find({ partnerId: profile._id, isDeleted: false });
      if (vehicles.length === 0) {
        return res.status(400).json({ success: false, message: "Cannot approve account: Partner has no vehicles." });
      }
      const hasPendingVehicles = vehicles.some(v => v.status !== "Active");
      if (hasPendingVehicles) {
        return res.status(400).json({ success: false, message: "Cannot approve account: There are unverified or rejected vehicles." });
      }

      const drivers = await PartnerDriver.find({ partnerId: profile._id, isDeleted: false });
      if (drivers.length === 0) {
        return res.status(400).json({ success: false, message: "Cannot approve account: Partner has no drivers." });
      }
      const hasPendingDrivers = drivers.some(d => d.status !== "Active");
      if (hasPendingDrivers) {
        return res.status(400).json({ success: false, message: "Cannot approve account: There are unverified or rejected drivers." });
      }
    }

    partner.status = status;
    await partner.save();

    if (status === "Rejected") {
      await PartnerProfile.findOneAndUpdate(
        { authId: partnerId },
        { $set: { isSubmittedForApproval: false } }
      );
    }

    // Log the action
    const actionLog = new PartnerActionLog({
      partnerId,
      adminId,
      actionType: "StatusChange",
      oldStatus,
      newStatus: status,
      reasons: reasons || [],
      comment: comment || ""
    });
    await actionLog.save();

    // Trigger email notification
    let subject = "";
    let htmlBody = "";
    let shouldSend = false;

    if (status === "Approved" || status === "Active") {
      subject = "MusafirBaba - Your Partner Account is Approved!";
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Account Approved</h2>
          <p>Congratulations!</p>
          <p>Your MusafirBaba partner account has been successfully verified and approved.</p>
          <p>You can now log in to the partner dashboard and start managing your fleet.</p>
          ${comment ? `<p><strong>Note from Admin:</strong> ${comment}</p>` : ''}
          <br/>
          <p>Thank you,<br/>The MusafirBaba Team</p>
        </div>
      `;
      shouldSend = true;
    } else if (status === "Hold") {
      subject = "MusafirBaba - Your Partner Account is on Hold";
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">Account on Hold</h2>
          <p>Your MusafirBaba partner account verification has been placed on hold.</p>
          <p><strong>Reasons:</strong> ${reasons && reasons.length > 0 ? reasons.join(', ') : 'Further review required.'}</p>
          ${comment ? `<p><strong>Note from Admin:</strong> ${comment}</p>` : ''}
          <p>Please log in to your dashboard to resolve these issues.</p>
          <br/>
          <p>Thank you,<br/>The MusafirBaba Team</p>
        </div>
      `;
      shouldSend = true;
    } else if (status === "Rejected") {
      subject = "MusafirBaba - Partner Account Application Rejected";
      htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Application Rejected</h2>
          <p>Unfortunately, your application to become a MusafirBaba partner has been rejected.</p>
          <p><strong>Reasons:</strong> ${reasons && reasons.length > 0 ? reasons.join(', ') : 'Does not meet requirements.'}</p>
          ${comment ? `<p><strong>Note from Admin:</strong> ${comment}</p>` : ''}
          <br/>
          <p>Thank you,<br/>The MusafirBaba Team</p>
        </div>
      `;
      shouldSend = true;
    }

    if (shouldSend) {
      await sendEmail(partner.email, subject, htmlBody);
      
      // Notify partner (in-app record + push, if they have a token)
      const pushProfile = await PartnerProfile.findOne({ authId: partnerId });
      if (pushProfile) {
        let pushBody = "Your account status has been updated.";
        if (status === "Approved" || status === "Active") pushBody = "Congratulations! Your partner account is approved.";
        else if (status === "Hold") pushBody = "Your account verification is on hold. Check details.";
        else if (status === "Rejected") pushBody = "Your application was rejected.";

        await notifyUser({
          recipientType: "Partner",
          recipientId: pushProfile._id,
          title: subject,
          message: pushBody,
          type: "Document",
          pushToken: pushProfile.pushToken,
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Partner status updated to ${status} successfully.`,
      data: partner,
    });
  } catch (error) {
    console.error("Update Partner Status Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/document/:documentId
// @desc    Verify a specific document (Approve or Reject)
export const verifyDocument = async (req, res) => {
  try {
    const { documentId } = req.params;
    const { status, remarks } = req.body; // status should be 'Approved' or 'Rejected'

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be Approved or Rejected." });
    }

    if (status === "Rejected" && !remarks) {
      return res.status(400).json({ success: false, message: "Remarks are required when rejecting a document." });
    }

    const document = await PartnerDocument.findById(documentId);
    if (!document) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    document.status = status; // Note: using status in db, verified status can also be updated
    document.verificationStatus = status;
    if (remarks) {
      document.remarks = remarks;
    }
    await document.save();

    return res.status(200).json({
      success: true,
      message: `Document ${status.toLowerCase()} successfully.`,
      data: document,
    });
  } catch (error) {
    console.error("Verify Document Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/:partnerId/profile
// @desc    Update partner profile from admin panel
export const updatePartnerProfile = async (req, res) => {
  try {
    const { partnerId } = req.params;
    const { fullName, mobileNumber, city, state, partnerType, agencyName, addressLine, pincode } = req.body;

    const profile = await PartnerProfile.findOne({ authId: partnerId });
    if (!profile) {
      return res.status(404).json({ success: false, message: "Partner profile not found" });
    }

    if (fullName) profile.fullName = fullName;
    if (mobileNumber) profile.mobileNumber = mobileNumber;
    if (city) profile.city = city;
    if (state) profile.state = state;
    if (partnerType) profile.partnerType = partnerType;
    if (agencyName !== undefined) profile.agencyName = agencyName;

    await profile.save();

    let address = await PartnerAddress.findOne({ partnerId: profile._id });
    if (address) {
      if (addressLine !== undefined) address.addressLine = addressLine;
      if (pincode !== undefined) address.pincode = pincode;
      if (city !== undefined) address.city = city;
      if (state !== undefined) address.state = state;
      await address.save();
    }

    return res.status(200).json({
      success: true,
      message: "Partner profile updated successfully.",
      data: profile,
    });
  } catch (error) {
    console.error("Update Partner Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/bank/:bankId/verify
// @desc    Verify or reject a partner's bank account
export const verifyBank = async (req, res) => {
  try {
    const { bankId } = req.params;
    const { status, remarks } = req.body; // 'Verified' or 'Rejected'

    if (!["Verified", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be Verified or Rejected." });
    }

    const bank = await PartnerBank.findById(bankId);
    if (!bank) return res.status(404).json({ success: false, message: "Bank not found" });

    bank.status = status;
    await bank.save();

    return res.status(200).json({ success: true, message: `Bank account marked as ${status}` });
  } catch (error) {
    console.error("verifyBank Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/vehicle/:vehicleId/verify
// @desc    Verify or reject a partner's vehicle
export const verifyVehicle = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { status, remarks } = req.body; // 'Active' (Verified) or 'Rejected'

    if (!["Active", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be Active or Rejected." });
    }

    const vehicle = await PartnerVehicle.findById(vehicleId);
    if (!vehicle) return res.status(404).json({ success: false, message: "Vehicle not found" });

    vehicle.status = status;
    await vehicle.save();

    return res.status(200).json({ success: true, message: `Vehicle marked as ${status}` });
  } catch (error) {
    console.error("verifyVehicle Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/partner-verification/driver/:driverId/verify
// @desc    Verify or reject a partner's driver
export const verifyDriver = async (req, res) => {
  try {
    const { driverId } = req.params;
    const { status, remarks } = req.body; // 'Active' (Verified) or 'Rejected'

    if (!["Active", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status. Must be Active or Rejected." });
    }

    const driver = await PartnerDriver.findById(driverId);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });

    driver.status = status;
    await driver.save();

    return res.status(200).json({ success: true, message: `Driver marked as ${status}` });
  } catch (error) {
    console.error("verifyDriver Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------------------
// Soft delete / restore
// ---------------------------------------------------------------------------

const ACTIVE_RIDE_STATUSES = ["ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"];

// Role is re-read from Staff (not the token) so permission-based staff and
// stale tokens can never pass. Module permissions are deliberately ignored.
const hasStaffRole = async (req, roles) => {
  const staffId = req.user?.sub || req.user?.id;
  if (!staffId) return false;
  const staff = await Staff.findById(staffId).select("role").lean();
  return !!staff && roles.includes(staff.role);
};

const getDeleteImpact = async (authId) => {
  const profile = await PartnerProfile.findOne({ authId }).select("walletBalance pendingWalletBalance");
  if (!profile) {
    return { hasProfile: false, activeRides: 0, totalRides: 0, walletBalance: 0, pendingWalletBalance: 0 };
  }
  const [activeRides, totalRides] = await Promise.all([
    RideBooking.countDocuments({ assignedPartnerId: profile._id, status: { $in: ACTIVE_RIDE_STATUSES } }),
    RideBooking.countDocuments({ assignedPartnerId: profile._id }),
  ]);
  return {
    hasProfile: true,
    activeRides,
    totalRides,
    walletBalance: profile.walletBalance || 0,
    pendingWalletBalance: profile.pendingWalletBalance || 0,
  };
};

// @route   GET /api/admin/partner-verification/:partnerId/delete-impact
// @desc    What is still open for this partner (shown as warnings before delete)
export const getPartnerDeleteImpact = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete partners." });
    }
    const partner = await PartnerAuth.findById(req.params.partnerId).select("email status");
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }
    const impact = await getDeleteImpact(partner._id);
    return res.status(200).json({ success: true, data: { email: partner.email, status: partner.status, ...impact } });
  } catch (error) {
    console.error("Partner Delete Impact Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// The one soft-delete routine, shared by single and bulk delete so both always
// behave identically. Admin chose "warn but allow": open rides / balances don't
// block the delete, they are recorded in the log for follow-up.
const softDeletePartner = async (partner, { reason, adminId }) => {
  const impact = await getDeleteImpact(partner._id);
  const oldStatus = partner.status;

  partner.statusBeforeDelete = oldStatus;
  partner.status = "Deleted";
  partner.deletedAt = new Date();
  partner.deletedBy = adminId;
  partner.deleteReason = reason;
  partner.refreshToken = undefined; // ends refresh-based sessions
  await partner.save();

  await PartnerProfile.findOneAndUpdate({ authId: partner._id }, { $set: { isDeleted: true, isOnline: false } });

  const openItems = [];
  if (impact.activeRides) openItems.push(`${impact.activeRides} active ride(s)`);
  if (impact.walletBalance) openItems.push(`₹${impact.walletBalance} available balance`);
  if (impact.pendingWalletBalance) openItems.push(`₹${impact.pendingWalletBalance} pending balance`);

  await PartnerActionLog.create({
    partnerId: partner._id,
    adminId,
    actionType: "StatusChange",
    oldStatus,
    newStatus: "Deleted",
    reasons: [reason],
    comment: openItems.length ? `Deleted with open items: ${openItems.join(", ")}` : "",
  });

  return impact;
};

// @route   DELETE /api/admin/partner-verification/:partnerId
// @desc    Soft-delete a partner: blocks login and dispatch, keeps all records
export const deletePartner = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete partners." });
    }

    const { partnerId } = req.params;
    const reason = String(req.body?.reason || "").trim();
    const confirmEmail = String(req.body?.confirmEmail || "").trim().toLowerCase();

    if (!reason) {
      return res.status(400).json({ success: false, message: "A reason is required to delete a partner." });
    }

    const partner = await PartnerAuth.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }
    if (partner.status === "Deleted") {
      return res.status(400).json({ success: false, message: "Partner is already deleted." });
    }
    if (confirmEmail !== String(partner.email).toLowerCase()) {
      return res.status(400).json({ success: false, message: "Confirmation email does not match this partner." });
    }

    const impact = await softDeletePartner(partner, { reason, adminId: req.user?.sub || req.user?.id });

    return res.status(200).json({ success: true, message: "Partner deleted", data: { status: "Deleted", impact } });
  } catch (error) {
    console.error("Delete Partner Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/partner-verification/:partnerId/restore
// @desc    Superadmin only: undo a soft delete, back to the previous status
export const restorePartner = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only a superadmin can restore partners." });
    }

    const partner = await PartnerAuth.findById(req.params.partnerId);
    if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }
    if (partner.status !== "Deleted") {
      return res.status(400).json({ success: false, message: "Partner is not deleted." });
    }

    const restoredStatus = partner.statusBeforeDelete || "In-Active";
    partner.status = restoredStatus;
    partner.deletedAt = undefined;
    partner.deletedBy = undefined;
    partner.deleteReason = undefined;
    partner.statusBeforeDelete = undefined;
    await partner.save();

    await PartnerProfile.findOneAndUpdate({ authId: partner._id }, { $set: { isDeleted: false } });

    await PartnerActionLog.create({
      partnerId: partner._id,
      adminId: req.user?.sub || req.user?.id,
      actionType: "StatusChange",
      oldStatus: "Deleted",
      newStatus: restoredStatus,
      reasons: [],
      comment: "Account restored",
    });

    return res.status(200).json({ success: true, message: "Partner restored", data: { status: restoredStatus } });
  } catch (error) {
    console.error("Restore Partner Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------------------
// Bulk soft delete (admin / superadmin)
// ---------------------------------------------------------------------------

const BULK_DELETE_LIMIT = 100;

// Validates and de-duplicates the ids sent by the admin UI.
const parseBulkPartnerIds = (raw) => {
  if (!Array.isArray(raw)) return { error: "partnerIds must be a list." };
  const ids = [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "Select at least one partner." };
  if (ids.length > BULK_DELETE_LIMIT) return { error: `You can delete at most ${BULK_DELETE_LIMIT} partners at once.` };
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) return { error: "One or more partner ids are invalid." };
  return { ids };
};

// @route   POST /api/admin/partner-verification/bulk-delete-impact
// @desc    Per-partner open items (active rides / balances) shown before a bulk delete
export const getBulkDeleteImpact = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete partners." });
    }
    const { ids, error } = parseBulkPartnerIds(req.body?.partnerIds);
    if (error) return res.status(400).json({ success: false, message: error });

    const partners = await PartnerAuth.find({ _id: { $in: ids } }).select("email status");
    const data = await Promise.all(
      partners.map(async (partner) => ({
        partnerId: partner._id,
        email: partner.email,
        status: partner.status,
        ...(await getDeleteImpact(partner._id)),
      }))
    );
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Bulk Delete Impact Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/partner-verification/bulk-delete
// @desc    Soft-delete several partners. Each one goes through the same
//          softDeletePartner routine as a single delete; one failure never
//          stops or undoes the others, and every outcome is reported back.
export const bulkDeletePartners = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete partners." });
    }

    const { ids, error } = parseBulkPartnerIds(req.body?.partnerIds);
    if (error) return res.status(400).json({ success: false, message: error });

    const reason = String(req.body?.reason || "").trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: "A reason is required to delete partners." });
    }
    // Typed confirmation must name the exact count, e.g. "DELETE 5".
    if (String(req.body?.confirmText || "").trim() !== `DELETE ${ids.length}`) {
      return res.status(400).json({ success: false, message: `Type "DELETE ${ids.length}" to confirm.` });
    }

    const adminId = req.user?.sub || req.user?.id;
    const deleted = [];
    const skipped = [];
    const failed = [];

    // Sequential on purpose: predictable, easy to audit, no write bursts.
    for (const id of ids) {
      try {
        const partner = await PartnerAuth.findById(id);
        if (!partner) {
          skipped.push({ partnerId: id, reason: "Not found" });
          continue;
        }
        if (partner.status === "Deleted") {
          skipped.push({ partnerId: id, reason: "Already deleted" });
          continue;
        }
        await softDeletePartner(partner, { reason, adminId });
        deleted.push(id);
      } catch (err) {
        console.error(`Bulk Delete Partner Error (${id}):`, err);
        failed.push({ partnerId: id, reason: "Server error" });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${deleted.length} partner(s)` +
        (skipped.length ? `, skipped ${skipped.length}` : "") +
        (failed.length ? `, failed ${failed.length}` : ""),
      data: { deleted, skipped, failed },
    });
  } catch (error) {
    console.error("Bulk Delete Partners Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
