import { apiClient } from './axios';

export interface RiderNotificationData {
  id: string;
  title: string;
  message: string;
  time: string;
  type: 'Ride' | 'Trip' | 'Payment' | 'Payout' | 'Document' | 'General' | 'System';
  read: boolean;
}

export const getMyNotifications = () =>
  apiClient.get<{ success: boolean; unreadCount: number; data: RiderNotificationData[] }>('/rider/notifications');

export const markAllNotificationsRead = () =>
  apiClient.patch<{ success: boolean; message: string }>('/rider/notifications/mark-read');
