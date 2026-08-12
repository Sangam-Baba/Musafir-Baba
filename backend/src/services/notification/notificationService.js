import { Notification } from "../../models/Notification.js";
import { sendPushNotification } from "../../utils/notifications.js";
import { publish } from "./transport.js";

/**
 * Single entry point for firing a notification to a rider or partner.
 * Writes the in-app Notification record, sends an Expo push (when the
 * recipient has a pushToken and sendPush isn't disabled), and publishes a
 * realtime event so an already-open app updates instantly instead of
 * waiting for the next screen load.
 *
 * @param {Object} params
 * @param {"Rider"|"Partner"} params.recipientType
 * @param {string} params.recipientId - RiderProfile._id or PartnerProfile._id
 * @param {string} params.title
 * @param {string} params.message
 * @param {string} [params.type] - matches the Notification model's type enum
 * @param {Object} [params.data]
 * @param {string} [params.pushToken] - recipient's Expo push token, if known
 * @param {boolean} [params.sendPush] - defaults to true
 */
export const notifyUser = async ({
  recipientType,
  recipientId,
  title,
  message,
  type,
  data = {},
  pushToken,
  sendPush = true,
}) => {
  const notification = await Notification.create({
    recipientType,
    recipientId,
    title,
    message,
    type,
    data,
  });

  if (sendPush && pushToken) {
    await sendPushNotification(pushToken, title, message, data);
  }

  try {
    const channelName = `notifications:${recipientType.toLowerCase()}:${recipientId}`;
    await publish(channelName, "new", {
      id: String(notification._id),
      title,
      message,
      type: notification.type,
      data,
      createdAt: notification.createdAt,
    });
  } catch (error) {
    // Realtime delivery is a best-effort enhancement on top of the DB
    // record and push notification above -- never let a transport hiccup
    // fail the request that triggered this notification.
    console.error("Realtime notification publish error:", error);
  }

  return notification;
};
