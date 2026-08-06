import { Expo } from 'expo-server-sdk';

const expo = new Expo();

/**
 * Sends a push notification to a specific expo push token.
 * 
 * @param {string} pushToken The device Expo push token
 * @param {string} title The title of the notification
 * @param {string} body The body/message of the notification
 * @param {object} data Any additional data payload
 */
export const sendPushNotification = async (pushToken, title, body, data = {}) => {
  if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
    console.error(`Push token ${pushToken} is not a valid Expo push token`);
    return false;
  }

  const messages = [{
    to: pushToken,
    sound: 'default',
    title: title,
    body: body,
    data: data,
  }];

  try {
    const chunks = expo.chunkPushNotifications(messages);
    const tickets = [];
    
    for (const chunk of chunks) {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
    
    console.log('Push notification sent successfully', tickets);
    return true;
  } catch (error) {
    console.error('Error sending push notification', error);
    return false;
  }
};
