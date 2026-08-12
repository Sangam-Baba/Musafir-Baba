import { create } from 'zustand';
import { getMyNotifications, markAllNotificationsRead, RiderNotificationData } from '../api/riderNotification.api';

interface RealtimeNotificationEvent {
  id: string;
  title: string;
  message: string;
  type: RiderNotificationData['type'];
  data?: Record<string, unknown>;
  createdAt?: string;
}

interface NotificationState {
  notifications: RiderNotificationData[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  handleRealtimeEvent: (event: RealtimeNotificationEvent) => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  fetchNotifications: async () => {
    set({ isLoading: true });
    try {
      const res = await getMyNotifications();
      if (res.data.success) {
        set({ notifications: res.data.data, unreadCount: res.data.unreadCount });
      }
    } catch (e) {
      console.error('Error fetching notifications:', e);
    } finally {
      set({ isLoading: false });
    }
  },
  markAllRead: async () => {
    const previous = get().notifications;
    set({
      notifications: previous.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    });
    try {
      await markAllNotificationsRead();
    } catch (e) {
      console.error('Error marking notifications read:', e);
    }
  },
  handleRealtimeEvent: (event) => {
    const incoming: RiderNotificationData = {
      id: event.id,
      title: event.title,
      message: event.message,
      time: 'Just now',
      type: event.type,
      read: false,
    };
    set((state) => ({
      notifications: [incoming, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
