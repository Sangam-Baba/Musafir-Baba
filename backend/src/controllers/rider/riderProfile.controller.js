import RiderProfile from "../../models/rider/RiderProfile.js";
import RiderAuth from "../../models/rider/RiderAuth.js";
import { uploadToR2 } from "../../services/fileUpload.service.js";

// @route   GET /api/rider/profile
// @desc    Fetch the logged-in rider's full profile (merges RiderProfile + email from RiderAuth)
export const getMyProfile = async (req, res) => {
  try {
    const authId = req.riderId;

    const [profile, auth] = await Promise.all([
      RiderProfile.findOne({ authId }),
      RiderAuth.findById(authId).select("email isEmailVerified"),
    ]);

    if (!profile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    return res.status(200).json({
      success: true,
      data: {
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber,
        profilePicture: profile.profilePicture,
        walletBalance: profile.walletBalance,
        email: auth?.email || "",
        isEmailVerified: auth?.isEmailVerified || false,
        isVerified: profile.isVerified || false,
      },
    });
  } catch (error) {
    console.error("Get Rider Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/rider/profile
// @desc    Update the logged-in rider's editable profile fields
export const updateMyProfile = async (req, res) => {
  try {
    const authId = req.riderId;
    const { fullName, mobileNumber } = req.body;

    const update = {};
    if (typeof fullName === "string" && fullName.trim()) update.fullName = fullName.trim();
    if (typeof mobileNumber === "string") update.mobileNumber = mobileNumber.trim();

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ success: false, message: "Nothing to update" });
    }

    const profile = await RiderProfile.findOneAndUpdate(
      { authId },
      { $set: update },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated",
      data: {
        fullName: profile.fullName,
        mobileNumber: profile.mobileNumber,
        profilePicture: profile.profilePicture,
        walletBalance: profile.walletBalance,
      },
    });
  } catch (error) {
    console.error("Update Rider Profile Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   POST /api/rider/profile/picture
// @desc    Upload/replace the logged-in rider's profile picture
export const uploadProfilePicture = async (req, res) => {
  try {
    const authId = req.riderId;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file uploaded" });
    }

    const fileUrl = await uploadToR2(req.file.buffer, "rider/profilePicture", req.file.mimetype);

    const profile = await RiderProfile.findOneAndUpdate(
      { authId },
      { $set: { profilePicture: fileUrl } },
      { new: true }
    );

    if (!profile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated",
      data: { profilePicture: profile.profilePicture },
    });
  } catch (error) {
    console.error("Upload Rider Profile Picture Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/rider/profile/push-token
// @desc    Store/update the rider's Expo push token for notifications
export const updatePushToken = async (req, res) => {
  try {
    const authId = req.riderId;
    const { pushToken } = req.body;

    if (!pushToken) {
      return res.status(400).json({ success: false, message: "pushToken is required" });
    }

    await RiderProfile.findOneAndUpdate(
      { authId },
      { $set: { pushToken } },
      { upsert: false }
    );

    return res.status(200).json({ success: true, message: "Push token updated" });
  } catch (error) {
    console.error("Update Rider Push Token Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
