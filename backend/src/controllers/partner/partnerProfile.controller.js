import PartnerProfile from "../../models/partner/PartnerProfile.js";
import PartnerAddress from "../../models/partner/PartnerAddress.js";
import PartnerBank from "../../models/partner/PartnerBank.js";
import PartnerVehicle from "../../models/partner/PartnerVehicle.js";
import PartnerDocument from "../../models/partner/PartnerDocument.js";

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

  const docs = await PartnerDocument.find({ ownerType: "PartnerProfile", ownerId: profile?._id });
  if (docs.length > 0) score += 10;

  return Math.min(score, 100);
};

// @route   GET /api/partner/profile/dashboard
// @desc    Get aggregated partner dashboard data
export const getDashboardProfile = async (req, res) => {
  try {
    const authId = req.partnerId;

    let profile = await PartnerProfile.findOne({ authId });
    
    // If profile doesn't exist yet, return empty state
    if (!profile) {
      return res.status(200).json({
        success: true,
        data: {
          profile: null,
          address: null,
          bank: null,
          vehicles: [],
          documents: [],
          completionPercentage: 10,
        },
      });
    }

    const address = await PartnerAddress.findOne({ partnerId: profile._id });
    const bank = await PartnerBank.findOne({ partnerId: profile._id, isPrimary: true });
    const vehicles = await PartnerVehicle.find({ partnerId: profile._id, isDeleted: false });
    const documents = await PartnerDocument.find({ ownerType: "PartnerProfile", ownerId: profile._id });

    // Ensure completion percentage is accurate
    const actualScore = await calculateCompletion(authId);
    if (profile.profileCompletionPercentage !== actualScore) {
      profile.profileCompletionPercentage = actualScore;
      await profile.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        profile,
        address,
        bank,
        vehicles,
        documents,
        completionPercentage: profile.profileCompletionPercentage,
      },
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

    // Upsert Profile
    let profile = await PartnerProfile.findOne({ authId });
    if (profile) {
      profile = await PartnerProfile.findOneAndUpdate(
        { authId },
        { $set: profileData },
        { new: true }
      );
    } else {
      profile = new PartnerProfile({
        authId,
        ...profileData,
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
    const score = await calculateCompletion(authId);
    profile.profileCompletionPercentage = score;
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
