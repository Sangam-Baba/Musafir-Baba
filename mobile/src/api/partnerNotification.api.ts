import { apiClient } from './axios';

export interface PartnerNotificationData {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'Trip' | 'System' | 'Document' | 'Payout';
  read: boolean;
}

export interface RealtimeTokenResponse {
  tokenRequest: Record<string, unknown>;
  channelName: string;
}

export const getMyNotifications = () =>
  apiClient.get<{ success: boolean; unreadCount: number; data: PartnerNotificationData[] }>('/partner/notifications');

export const markAllNotificationsRead = () =>
  apiClient.patch<{ success: boolean; message: string }>('/partner/notifications/mark-read');

export const getNotificationsRealtimeToken = () =>
  apiClient.get<{ success: boolean; data: RealtimeTokenResponse }>('/partner/notifications/realtime-token');
