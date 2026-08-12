import { Realtime, RealtimeChannel, InboundMessage } from 'ably';

export interface NotificationTokenResponse {
  tokenRequest: Record<string, unknown>;
  channelName: string;
}

/**
 * Ably implementation of the realtime notification transport contract
 * (see ./realtimeTransport.ts for the contract itself). Swap this file out
 * for a Socket.IO (or any other) implementation without touching
 * useRealtimeNotifications.ts or the notification store.
 */

let client: Realtime | null = null;
let channelName: string | null = null;

export const connect = async (
  fetchToken: () => Promise<NotificationTokenResponse>
): Promise<void> => {
  const initial = await fetchToken();
  channelName = initial.channelName;

  client = new Realtime({
    authCallback: (_params, callback) => {
      fetchToken()
        .then((res) => callback(null, res.tokenRequest as any))
        .catch((error) => callback(error, null));
    },
  });
};

export const subscribeToNotifications = (
  onMessage: (payload: any) => void
): (() => void) => {
  if (!client || !channelName) {
    return () => {};
  }

  const channel: RealtimeChannel = client.channels.get(channelName);
  const listener = (message: InboundMessage) => onMessage(message.data);
  channel.subscribe('new', listener);

  return () => channel.unsubscribe('new', listener);
};

export const disconnect = (): void => {
  client?.close();
  client = null;
  channelName = null;
};
