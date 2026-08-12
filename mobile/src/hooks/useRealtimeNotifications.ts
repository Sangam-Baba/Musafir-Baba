import { useEffect } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { getNotificationsRealtimeToken } from '../api/partnerNotification.api';
import { connect, subscribeToNotifications, disconnect } from '../services/realtime/realtimeTransport';

const fetchToken = async () => {
  const res = await getNotificationsRealtimeToken();
  return res.data.data;
};

/**
 * Opens a realtime connection (via the transport in services/realtime) once
 * the partner is authenticated, and feeds incoming notification events into
 * useNotificationStore so the Inbox screen and unread badges update
 * instantly instead of waiting for the next screen load. Purely additive --
 * doesn't touch the existing push-notification flow (usePushNotifications).
 */
export const useRealtimeNotifications = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const handleRealtimeEvent = useNotificationStore((state) => state.handleRealtimeEvent);

  useEffect(() => {
    if (!isAuthenticated) return;

    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    connect(fetchToken)
      .then(() => {
        if (cancelled) return;
        unsubscribe = subscribeToNotifications(handleRealtimeEvent);
      })
      .catch((e) => console.log('Realtime notifications unavailable:', e));

    return () => {
      cancelled = true;
      unsubscribe?.();
      disconnect();
    };
  }, [isAuthenticated, handleRealtimeEvent]);
};
