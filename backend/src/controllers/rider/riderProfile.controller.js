import RiderProfile from "../../models/rider/RiderProfile.js";

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
