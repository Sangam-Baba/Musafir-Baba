import RiderProfile from "../models/rider/RiderProfile.js";
import RiderAuth from "../models/rider/RiderAuth.js";
import RiderDocument from "../models/rider/RiderDocument.js";
import { RideBooking } from "../models/RideBooking.js";

// @route   GET /api/admin/riders
// @desc    List all riders with profile, email, document, and verification status
export const getAllRiders = async (req, res) => {
  try {
    const profiles = await RiderProfile.find().sort({ createdAt: -1 }).lean();
    const authIds = profiles.map((p) => p.authId);
    const profileIds = profiles.map((p) => p._id);

    const [auths, documents] = await Promise.all([
      RiderAuth.find({ _id: { $in: authIds } }).select("email isEmailVerified status").lean(),
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
      RiderAuth.findById(profile.authId).select("email isEmailVerified status createdAt").lean(),
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
          ? { email: auth.email, isEmailVerified: auth.isEmailVerified, status: auth.status }
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
