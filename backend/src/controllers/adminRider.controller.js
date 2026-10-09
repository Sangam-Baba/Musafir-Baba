import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";
import RiderDocument from "../models/rider/RiderDocument.js";
import { RideBooking } from "../models/RideBooking.js";
import { Staff } from "../models/Staff.js";
import mongoose from "mongoose";

// @route   GET /api/admin/riders
// @desc    List all riders with profile, email, document, and verification status
export const getAllRiders = async (req, res) => {
  try {
    const profiles = await RiderProfile.find().sort({ createdAt: -1 }).lean();
    const authIds = profiles.map((p) => p.authId);
    const profileIds = profiles.map((p) => p._id);

    const [auths, documents] = await Promise.all([
      RiderAuth.find({ _id: { $in: authIds } }).select("email isEmailVerified status deletedAt deleteReason").lean(),
      RiderDocument.find({ riderProfileId: { $in: profileIds } }).lean(),
    ]);
    const authById = new Map(auths.map((a) => [String(a._id), a]));
    const documentByProfileId = new Map(documents.map((d) => [String(d.riderProfileId), d]));

    const data = profiles.map((profile) => {
      const auth = authById.get(String(profile.authId));
      const document = documentByProfileId.get(String(profile._id));
      return {
        _id: profile._id,
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber,
        profilePicture: profile.profilePicture,
        isVerified: profile.isVerified || false,
        isActive: profile.isActive,
        email: auth?.email || "",
        isEmailVerified: auth?.isEmailVerified || false,
        status: auth?.status || "",
        deletedAt: auth?.deletedAt,
        deleteReason: auth?.deleteReason,
        document: document
          ? {
              status: document.status,
              hasFront: !!document.fileUrlFront,
              hasBack: !!document.fileUrlBack,
              documentName: document.documentName,
              documentIdNumber: document.documentIdNumber,
            }
          : null,
        createdAt: profile.createdAt,
      };
    });

    return res.status(200).json({ success: true, total: data.length, data });
  } catch (error) {
    console.error("Get All Riders Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/admin/riders/:id
// @desc    Full rider detail: profile, document, and booking history
export const getRiderDetail = async (req, res) => {
  try {
    const profile = await RiderProfile.findById(req.params.id).lean();
    if (!profile) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    const [auth, document, bookings] = await Promise.all([
      RiderAuth.findById(profile.authId).select("email isEmailVerified status createdAt deletedAt deleteReason").lean(),
      RiderDocument.findOne({ riderProfileId: profile._id }).lean(),
      RideBooking.find({ rider: profile._id }).sort({ createdAt: -1 }).lean(),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        profile: {
          _id: profile._id,
          fullName: profile.fullName,
          mobileNumber: profile.mobileNumber,
          profilePicture: profile.profilePicture,
          walletBalance: profile.walletBalance,
          isVerified: profile.isVerified || false,
          isActive: profile.isActive,
          createdAt: profile.createdAt,
        },
        auth: auth
          ? { email: auth.email, isEmailVerified: auth.isEmailVerified, status: auth.status, deletedAt: auth.deletedAt, deleteReason: auth.deleteReason }
          : null,
        document: document
          ? {
              _id: document._id,
              documentType: document.documentType,
              documentName: document.documentName,
              documentIdNumber: document.documentIdNumber,
              fileUrlFront: document.fileUrlFront,
              fileUrlBack: document.fileUrlBack,
              status: document.status,
              remarks: document.remarks,
            }
          : null,
        bookings: bookings.map((b) => ({
          _id: b._id,
          pickup: b.pickup?.address,
          drop: b.drop?.address,
          rideDate: b.rideDate,
          rideTime: b.rideTime,
          vehicleCategory: b.vehicleCategory,
          totalAmount: b.totalAmount,
          status: b.status,
          createdAt: b.createdAt,
        })),
      },
    });
  } catch (error) {
    console.error("Get Rider Detail Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/riders/:id/document
// @desc    Approve or reject the rider's submitted document
export const verifyRiderDocument = async (req, res) => {
  try {
    const { status, remarks } = req.body;
    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "status must be Approved or Rejected" });
    }
    if (status === "Rejected" && !remarks) {
      return res.status(400).json({ success: false, message: "remarks are required when rejecting a document" });
    }

    const document = await RiderDocument.findOneAndUpdate(
      { riderProfileId: req.params.id },
      {
        $set: {
          status,
          remarks: remarks || undefined,
          verifiedBy: req.user?.sub,
          verifiedAt: new Date(),
        },
      },
      { new: true }
    );

    if (!document) {
      return res.status(404).json({ success: false, message: "No document found for this rider" });
    }

    return res.status(200).json({ success: true, message: `Document ${status.toLowerCase()}`, data: document });
  } catch (error) {
    console.error("Verify Rider Document Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PUT /api/admin/riders/:id/verify
// @desc    Mark (or unmark) a rider as verified. Marking verified is gated on
//          a profile picture existing AND a document with both sides uploaded --
//          enforced here server-side, not just left to the admin UI.
export const setRiderVerified = async (req, res) => {
  try {
    const { isVerified } = req.body;
    if (typeof isVerified !== "boolean") {
      return res.status(400).json({ success: false, message: "isVerified (boolean) is required" });
    }

    const profile = await RiderProfile.findById(req.params.id);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    if (isVerified) {
      if (!profile.profilePicture) {
        return res.status(400).json({ success: false, message: "Rider has no profile picture uploaded yet" });
      }
      const document = await RiderDocument.findOne({ riderProfileId: profile._id });
      if (!document || !document.fileUrlFront || !document.fileUrlBack) {
        return res.status(400).json({ success: false, message: "Rider has not uploaded both sides of their document yet" });
      }
    }

    profile.isVerified = isVerified;
    await profile.save();

    return res.status(200).json({
      success: true,
      message: isVerified ? "Rider marked as verified" : "Rider verification revoked",
      data: { isVerified: profile.isVerified },
    });
  } catch (error) {
    console.error("Set Rider Verified Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// ---------------------------------------------------------------------------
// Soft delete / restore (single + bulk). Same model as partner deletion:
// nothing is erased, status "Deleted" blocks login, bookings/documents/wallet
// are kept, the email stays reserved, a superadmin can restore.
// ---------------------------------------------------------------------------

// Rides that are booked/paid but not finished yet.
const OPEN_RIDE_STATUSES = ["PAYMENT_PENDING", "PAID", "AWAITING_ASSIGNMENT", "ACCEPTED", "DRIVER_EN_ROUTE", "ARRIVED", "ONGOING"];
const RIDER_BULK_DELETE_LIMIT = 100;

// Role is re-read from Staff (not the token); module permissions are ignored.
const hasStaffRole = async (req, roles) => {
  const staffId = req.user?.sub || req.user?.id;
  if (!staffId) return false;
  const staff = await Staff.findById(staffId).select("role").lean();
  return !!staff && roles.includes(staff.role);
};

const getRiderDeleteImpact = async (profile) => {
  const [openRides, totalRides] = await Promise.all([
    RideBooking.countDocuments({ rider: profile._id, status: { $in: OPEN_RIDE_STATUSES } }),
    RideBooking.countDocuments({ rider: profile._id }),
  ]);
  return { openRides, totalRides, walletBalance: profile.walletBalance || 0 };
};

// The one soft-delete routine, shared by single and bulk delete.
const softDeleteRider = async (profile, auth, { reason, adminId }) => {
  const impact = await getRiderDeleteImpact(profile);

  auth.statusBeforeDelete = auth.status;
  auth.status = "Deleted";
  auth.deletedAt = new Date();
  auth.deletedBy = adminId;
  auth.deleteReason = reason;
  auth.refreshToken = undefined; // ends refresh-based sessions
  await auth.save();

  await RiderProfile.updateOne({ _id: profile._id }, { $set: { isDeleted: true } });
  return impact;
};

// @route   GET /api/admin/riders/:id/delete-impact
export const getRiderDeleteImpactHandler = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete riders." });
    }
    const profile = await RiderProfile.findById(req.params.id).select("authId walletBalance");
    if (!profile) return res.status(404).json({ success: false, message: "Rider not found" });
    const auth = await RiderAuth.findById(profile.authId).select("email status");
    const impact = await getRiderDeleteImpact(profile);
    return res.status(200).json({ success: true, data: { email: auth?.email || "", status: auth?.status || "", ...impact } });
  } catch (error) {
    console.error("Rider Delete Impact Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   DELETE /api/admin/riders/:id
export const deleteRider = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete riders." });
    }
    const reason = String(req.body?.reason || "").trim();
    const confirmEmail = String(req.body?.confirmEmail || "").trim().toLowerCase();
    if (!reason) {
      return res.status(400).json({ success: false, message: "A reason is required to delete a rider." });
    }

    const profile = await RiderProfile.findById(req.params.id).select("authId walletBalance");
    if (!profile) return res.status(404).json({ success: false, message: "Rider not found" });
    const auth = await RiderAuth.findById(profile.authId);
    if (!auth) return res.status(404).json({ success: false, message: "Rider account not found" });
    if (auth.status === "Deleted") {
      return res.status(400).json({ success: false, message: "Rider is already deleted." });
    }
    if (confirmEmail !== String(auth.email).toLowerCase()) {
      return res.status(400).json({ success: false, message: "Confirmation email does not match this rider." });
    }

    const impact = await softDeleteRider(profile, auth, { reason, adminId: req.user?.sub || req.user?.id });
    return res.status(200).json({ success: true, message: "Rider deleted", data: { status: "Deleted", impact } });
  } catch (error) {
    console.error("Delete Rider Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/riders/:id/restore   (superadmin only)
export const restoreRider = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only a superadmin can restore riders." });
    }
    const profile = await RiderProfile.findById(req.params.id).select("authId");
    if (!profile) return res.status(404).json({ success: false, message: "Rider not found" });
    const auth = await RiderAuth.findById(profile.authId);
    if (!auth || auth.status !== "Deleted") {
      return res.status(400).json({ success: false, message: "Rider is not deleted." });
    }

    const restoredStatus = auth.statusBeforeDelete || "Active";
    auth.status = restoredStatus;
    auth.deletedAt = undefined;
    auth.deletedBy = undefined;
    auth.deleteReason = undefined;
    auth.statusBeforeDelete = undefined;
    await auth.save();
    await RiderProfile.updateOne({ _id: profile._id }, { $set: { isDeleted: false } });

    return res.status(200).json({ success: true, message: "Rider restored", data: { status: restoredStatus } });
  } catch (error) {
    console.error("Restore Rider Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

const parseBulkRiderIds = (raw) => {
  if (!Array.isArray(raw)) return { error: "riderIds must be a list." };
  const ids = [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length === 0) return { error: "Select at least one rider." };
  if (ids.length > RIDER_BULK_DELETE_LIMIT) return { error: `You can delete at most ${RIDER_BULK_DELETE_LIMIT} riders at once.` };
  if (ids.some((id) => !mongoose.Types.ObjectId.isValid(id))) return { error: "One or more rider ids are invalid." };
  return { ids };
};

// @route   POST /api/admin/riders/bulk-delete-impact
export const getBulkRiderDeleteImpact = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete riders." });
    }
    const { ids, error } = parseBulkRiderIds(req.body?.riderIds);
    if (error) return res.status(400).json({ success: false, message: error });

    const profiles = await RiderProfile.find({ _id: { $in: ids } }).select("authId walletBalance");
    const data = await Promise.all(profiles.map(async (profile) => ({ riderId: profile._id, ...(await getRiderDeleteImpact(profile)) })));
    return res.status(200).json({ success: true, data });
  } catch (error) {
    console.error("Bulk Rider Delete Impact Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/admin/riders/bulk-delete
// Each rider goes through softDeleteRider; one failure never stops or undoes
// the others, and every outcome is reported back.
export const bulkDeleteRiders = async (req, res) => {
  try {
    if (!(await hasStaffRole(req, ["admin", "superadmin"]))) {
      return res.status(403).json({ success: false, message: "Only admins can delete riders." });
    }
    const { ids, error } = parseBulkRiderIds(req.body?.riderIds);
    if (error) return res.status(400).json({ success: false, message: error });

    const reason = String(req.body?.reason || "").trim();
    if (!reason) return res.status(400).json({ success: false, message: "A reason is required to delete riders." });
    if (String(req.body?.confirmText || "").trim() !== `DELETE ${ids.length}`) {
      return res.status(400).json({ success: false, message: `Type "DELETE ${ids.length}" to confirm.` });
    }

    const adminId = req.user?.sub || req.user?.id;
    const deleted = [];
    const skipped = [];
    const failed = [];

    for (const id of ids) {
      try {
        const profile = await RiderProfile.findById(id).select("authId walletBalance");
        const auth = profile ? await RiderAuth.findById(profile.authId) : null;
        if (!profile || !auth) {
          skipped.push({ riderId: id, reason: "Not found" });
          continue;
        }
        if (auth.status === "Deleted") {
          skipped.push({ riderId: id, reason: "Already deleted" });
          continue;
        }
        await softDeleteRider(profile, auth, { reason, adminId });
        deleted.push(id);
      } catch (err) {
        console.error(`Bulk Delete Rider Error (${id}):`, err);
        failed.push({ riderId: id, reason: "Server error" });
      }
    }

    return res.status(200).json({
      success: true,
      message: `Deleted ${deleted.length} rider(s)` +
        (skipped.length ? `, skipped ${skipped.length}` : "") +
        (failed.length ? `, failed ${failed.length}` : ""),
      data: { deleted, skipped, failed },
    });
  } catch (error) {
    console.error("Bulk Delete Riders Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
