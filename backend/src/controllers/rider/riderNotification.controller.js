import RiderProfile from "../../models/rider/RiderProfile.js";
import { Notification } from "../../models/Notification.js";
import { createTokenRequest } from "../../services/notification/transport.js";

function toRelativeTime(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

// @route   GET /api/rider/notifications
// @desc    Get the logged-in rider's notification feed
export const getNotifications = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id");
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    const notifications = await Notification.find({
      recipientType: "Rider",
      recipientId: riderProfile._id,
    })
      .sort({ createdAt: -1 })
      .limit(50);

    const data = notifications.map((n) => ({
      id: String(n._id),
      title: n.title,
      message: n.message,
      time: toRelativeTime(n.createdAt),
      type: n.type,
      read: n.read,
    }));

    return res.status(200).json({
      success: true,
      unreadCount: notifications.filter((n) => !n.read).length,
      data,
    });
  } catch (error) {
    console.error("Get Rider Notifications Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   PATCH /api/rider/notifications/mark-read
// @desc    Mark all of the logged-in rider's notifications as read
export const markNotificationsRead = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id");
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    await Notification.updateMany(
      { recipientType: "Rider", recipientId: riderProfile._id, read: false },
      { $set: { read: true } }
    );

    return res.status(200).json({ success: true, message: "Notifications marked as read" });
  } catch (error) {
    console.error("Mark Rider Notifications Read Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @route   GET /api/rider/notifications/realtime-token
// @desc    Issue a short-lived realtime auth token scoped to this rider's own notification channel
export const getRealtimeToken = async (req, res) => {
  try {
    const riderProfile = await RiderProfile.findOne({ authId: req.riderId }).select("_id");
    if (!riderProfile) {
      return res.status(404).json({ success: false, message: "Rider profile not found" });
    }

    const channelName = `notifications:rider:${riderProfile._id}`;
    const tokenRequest = await createTokenRequest(String(riderProfile._id), channelName);

    return res.status(200).json({ success: true, data: { tokenRequest, channelName } });
  } catch (error) {
    console.error("Get Rider Realtime Token Error:", error);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
};
