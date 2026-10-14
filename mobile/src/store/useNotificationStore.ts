import { create } from 'zustand';
import { getMyNotifications, markAllNotificationsRead, markNotificationRead, PartnerNotificationData } from '../api/partnerNotification.api';

interface RealtimeNotificationEvent {
  id: string;
  title: string;
  message: string;
  type: PartnerNotificationData['type'];
  data?: Record<string, unknown>;
  createdAt?: string;
}

interface NotificationState {
  notifications: PartnerNotificationData[];
  unreadCount: number;
  isLoading: boolean;
  fetchNotifications: () => Promise<void>;
  markAllRead: () => Promise<void>;
  markRead: (id: string) => void;
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
  // One notification: updated on screen right away, then saved.
  markRead: (id) => {
    const target = get().notifications.find((n) => n.id === id);
    if (!target || target.read) return;
    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
    markNotificationRead(id).catch((e) => console.error('Error marking notification read:', e));
  },
  handleRealtimeEvent: (event) => {
    const incoming: PartnerNotificationData = {
      id: event.id,
      title: event.title,
      message: event.message,
      time: 'Just now',
      type: event.type,
      read: false,
      data: event.data,
      createdAt: event.createdAt,
    };
    set((state) => ({
      notifications: [incoming, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },
}));
