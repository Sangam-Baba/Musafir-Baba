import * as ablyTransport from "./transports/ablyTransport.js";

/**
 * Realtime notification transport contract:
 *
 *   publish(channelName: string, eventName: string, payload: object): Promise<void>
 *     Broadcasts `payload` to every client subscribed to `channelName`.
 *
 *   createTokenRequest(clientId: string, channelName: string): Promise<object>
 *     Returns a short-lived, scoped auth credential a client can use to
 *     connect and subscribe to `channelName` only.
 *
 * To move from Ably to Socket.IO (or any other realtime provider) later,
 * implement both functions in a new file under ./transports/ and swap the
 * import below. Nothing else in the app -- notificationService.js, the
 * realtime-token routes, or any controller -- needs to change.
 */
export const { publish, createTokenRequest } = ablyTransport;
