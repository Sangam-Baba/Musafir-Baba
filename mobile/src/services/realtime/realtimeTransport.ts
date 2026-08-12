import * as ablyTransport from './ablyTransport';

export type { NotificationTokenResponse } from './ablyTransport';

/**
 * Realtime notification transport contract:
 *
 *   connect(fetchToken): Promise<void>
 *     Opens a realtime connection, authenticating via `fetchToken` (which
 *     hits the backend's scoped realtime-token endpoint). `fetchToken` is
 *     also used to silently renew the connection's auth token over time.
 *
 *   subscribeToNotifications(onMessage): () => void
 *     Starts listening for new-notification events on the current user's
 *     channel. Returns an unsubscribe function.
 *
 *   disconnect(): void
 *     Closes the realtime connection.
 *
 * To move from Ably to Socket.IO (or any other realtime provider) later,
 * implement all three functions in a new file next to ablyTransport.ts and
 * swap the import below. Nothing else -- the notification store, the
 * useRealtimeNotifications hook, or any screen -- needs to change.
 */
export const { connect, subscribeToNotifications, disconnect } = ablyTransport;
