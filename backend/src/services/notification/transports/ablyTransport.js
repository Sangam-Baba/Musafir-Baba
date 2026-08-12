import getAblyRest from "../../../config/ably.js";

/**
 * Ably implementation of the realtime notification transport contract
 * (see ../transport.js for the contract itself). Swap this file out for a
 * Socket.IO (or any other) implementation without touching notificationService.js
 * or any of its callers.
 */

export const publish = async (channelName, eventName, payload) => {
  const channel = getAblyRest().channels.get(channelName);
  await channel.publish(eventName, payload);
};

export const createTokenRequest = async (clientId, channelName) => {
  return getAblyRest().auth.createTokenRequest({
    clientId,
    capability: {
      [channelName]: ["subscribe"],
    },
  });
};
