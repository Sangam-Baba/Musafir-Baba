import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerAddress from "../../models/partner/PartnerAddress.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDocument from "../../models/partner/PartnerDocument.js";
import PartnerAuth from "../../models/partner/PartnerAuth.js";
import PartnerActionLog from "../../models/partner/PartnerActionLog.js";
import sendEmail from "../../services/email.service.js";

// Helper function to calculate completion percentage
const calculateCompletion = async (partnerId) => {
  let score = 10; // Base score for registration

  const profile = await PartnerProfile.findOne({ authId: partnerId });
  if (profile && profile.fullName && profile.mobileNumber) score += 20;

  const address = await PartnerAddress.findOne({ partnerId: profile?._id });
  if (address && address.city && address.state) score += 20;

  const bank = await PartnerBank.findOne({ partnerId: profile?._id, isPrimary: true });
  if (bank) score += 20;

  const vehicle = await PartnerVehicle.findOne({ partnerId: profile?._id, isDeleted: false });
  if (vehicle) score += 20;

  const docs = await PartnerDocument.find({
    ownerType: "PartnerProfile",
    ownerId: profile?._id,
    status: { $ne: "Archived" },
  });
  if (docs.length > 0) score += 10;

  return Math.min(score, 100);
};

const buildPartnerDashboard = async (authId) => {
  const [profile, auth, logs] = await Promise.all([
    PartnerProfile.findOne({ authId }),
    PartnerAuth.findById(authId).select("status email isEmailVerified createdAt"),
    PartnerActionLog.find({ partnerId: authId }).sort({ createdAt: -1 }),
  ]);

  if (!profile) {
    return {
      profile: null,
      address: null,
      bank: null,
      vehicles: [],
      drivers: [],
      documents: [],
      auth,
      logs,
      completionPercentage: 10,
    };
  }

  const [address, bank, vehicles, documents, drivers] = await Promise.all([
    PartnerAddress.findOne({ partnerId: profile._id }),
    PartnerBank.findOne({ partnerId: profile._id, isPrimary: true }),
    PartnerVehicle.find({ partnerId: profile._id, isDeleted: false }),
    PartnerDocument.find({
      ownerType: "PartnerProfile",
      ownerId: profile._id,
      status: { $ne: "Archived" },
    }),
    (await import("../../models/partner/PartnerDriver.js")).default.find({
      partnerId: profile._id,
      isDeleted: false,
    }),
  ]);
  const actualScore = await calculateCompletion(authId);
  if (profile.profileCompletionPercentage !== actualScore) {
    profile.profileCompletionPercentage = actualScore;
    await profile.save();
  }

  return {
    profile,
    address,
    bank,
    vehicles,
    drivers,
    documents,
    auth,
    logs,
    completionPercentage: profile.profileCompletionPercentage,
  };
};

// @route   GET /api/partner/profile/dashboard
// @desc    Get aggregated partner dashboard data
export const getDashboardProfile = async (req, res) => {
  try {
    const authId = req.partnerId;
    return res.status(200).json({
      success: true,
      data: await buildPartnerDashboard(authId),
    });
  } catch (error) {
    console.error("Get Dashboard Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/profile
// @desc    Create or update Partner Profile and Address
export const updateProfile = async (req, res) => {
  try {
    const authId = req.partnerId;
    const { profileData, addressData } = req.body;

    if (!profileData || !profileData.fullName || !profileData.mobileNumber) {
      return res.status(400).json({ success: false, message: "Full Name and Mobile Number are required" });
    }

    // Check for Travel Agency
    if (profileData.partnerType === "Travel Agency" && !profileData.agencyName) {
      return res.status(400).json({ success: false, message: "Agency Name is required for Travel Agencies." });
    }

    const normalizedProfileData = {
      ...profileData,
      agencyName: profileData.agencyName || "",
      partnerType: profileData.partnerType || "Individual",
    };

    // Upsert Profile
    let profile = await PartnerProfile.findOne({ authId });
    if (profile) {
      profile = await PartnerProfile.findOneAndUpdate(
        { authId },
        { $set: normalizedProfileData },
        { new: true }
      );
    } else {
      profile = new PartnerProfile({
        authId,
        ...normalizedProfileData,
      });
      await profile.save();
    }

    // Upsert Address
    let address = null;
    if (addressData && addressData.city && addressData.state) {
      address = await PartnerAddress.findOne({ partnerId: profile._id, type: addressData.type || "Current" });
      if (address) {
        address = await PartnerAddress.findOneAndUpdate(
          { _id: address._id },
          { $set: addressData },
          { new: true }
        );
      } else {
        address = new PartnerAddress({
          partnerId: profile._id,
          type: addressData.type || "Current",
          ...addressData,
        });
        await address.save();
      }
    }

    // Recalculate Score
    profile.profileCompletionPercentage = await calculateCompletion(authId);
    await profile.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: { profile, address },
    });
  } catch (error) {
    console.error("Update Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/partner/profile/submit
// @desc    Submit profile for admin approval
export const submitProfileForApproval = async (req, res) => {
  try {
    const authId = req.partnerId;
    const profile = await PartnerProfile.findOne({ authId });

    if (!profile) {
      return res.status(404).json({ success: false, message: "Profile not found" });
    }

    if (profile.profileCompletionPercentage < 100) {
      return res.status(400).json({ success: false, message: "Please complete your profile to 100% before submitting." });
    }

    const auth = await PartnerAuth.findById(authId);
    if (!auth) {
      return res.status(404).json({ success: false, message: "Partner account not found" });
    }

    if (["PendingVerification", "Approved", "Blacklisted", "In-Active", "Suspended"].includes(auth.status)) {
      return res.status(400).json({ success: false, message: "This profile cannot be submitted in its current status." });
    }

    const oldStatus = auth.status;
    profile.isSubmittedForApproval = true;
    auth.status = "PendingVerification";
    await Promise.all([profile.save(), auth.save()]);

    await PartnerActionLog.create({
      partnerId: authId,
      actionType: "StatusChange",
      oldStatus,
      newStatus: "PendingVerification",
      comment: oldStatus === "Rejected" ? "Partner resubmitted the profile for review." : "Partner submitted the profile for review.",
    });

    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Profile Submitted for Verification</h2>
        <p>Hi ${profile.fullName},</p>
        <p>Your partner profile has been successfully submitted and is now pending review by our team.</p>
        <p>We will notify you once the verification process is complete or if further action is required.</p>
        <p>Thank you,<br/>The MusafirBaba Team</p>
      </div>
    `;
    await sendEmail(auth.email, "MusafirBaba - Profile Submitted for Verification", emailHtml);

    return res.status(200).json({
      success: true,
      message: "Profile successfully submitted for approval.",
    });
  } catch (error) {
    console.error("Submit Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
