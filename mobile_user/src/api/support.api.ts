import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { apiClient } from './axios';

// Help & Support tickets (backend: /api/support).

export interface SupportIssue {
  key: string;
  label: string;
  hint: string;
  quick: string[];
}
export interface SupportService {
  key: string;
  label: string;
  subtitle: string;
  bookingKind: 'RIDE' | 'TOUR' | 'VISA' | null;
  issues: SupportIssue[];
}
export interface SupportBooking {
  kind: 'RIDE' | 'TOUR' | 'VISA';
  id: string;
  code: string;
  title: string;
  subtitle: string;
  status?: string;
}
export interface SupportAttachment {
  url: string;
  key?: string;
  format?: string;
  size?: number;
}
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export interface SupportMessage {
  _id: string;
  from: 'RIDER' | 'ADMIN';
  name: string;
  text?: string;
  attachments?: SupportAttachment[];
  at: string;
}
export interface SupportTicket {
  _id: string;
  ticketId: string;
  service: string;
  serviceLabel: string;
  issueKey: string;
  issueLabel: string;
  quickOptions: string[];
  description: string;
  attachments: SupportAttachment[];
  booking?: Partial<SupportBooking>;
  preferredContact?: { method: 'CALL' | 'WHATSAPP' | 'EMAIL'; value?: string };
  expectedResolution?: string;
  status: TicketStatus;
  priority: string;
  resolutionNote?: string;
  messages?: SupportMessage[];
  statusHistory?: { status: TicketStatus; by?: string; at: string }[];
  riderUnread?: boolean;
  lastActivityAt: string;
  createdAt: string;
  resolvedAt?: string;
}

export interface NewTicketPayload {
  service: string;
  issueKey: string;
  bookingId?: string;
  quickOptions: string[];
  description: string;
  attachments: SupportAttachment[];
  preferredContact: { method: 'CALL' | 'WHATSAPP'; value: string };
  expectedResolution?: string;
}

export const getSupportCatalog = () => apiClient.get<{ success: boolean; data: SupportService[] }>('/support/catalog');
export const getSupportBookings = (service: string) =>
  apiClient.get<{ success: boolean; data: SupportBooking[] }>('/support/bookings', { params: { service } });
export const createSupportTicket = (payload: NewTicketPayload) =>
  apiClient.post<{ success: boolean; data: SupportTicket }>('/support/tickets', payload);
export const getMySupportTickets = () => apiClient.get<{ success: boolean; data: SupportTicket[] }>('/support/tickets');
export const getSupportTicket = (id: string) => apiClient.get<{ success: boolean; data: SupportTicket }>(`/support/tickets/${id}`);
export const replySupportTicket = (id: string, text: string) =>
  apiClient.post<{ success: boolean; data: SupportTicket }>(`/support/tickets/${id}/messages`, { text });

export const SUPPORT_PHONE = '+919289602447';
export const SUPPORT_PHONE_DISPLAY = '+91 92896 02447';
export const MAX_SUPPORT_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// Photo upload: same presigned Cloudflare R2 upload the visa documents use.
export async function uploadSupportPhoto(file: { uri: string; name: string; mimeType: string; size?: number }): Promise<SupportAttachment> {
  const safeName = file.name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80) || 'photo.jpg';
  const presign = await apiClient.post<{ uploadUrl: string; fileUrl: string; key: string }>('/upload/cloudflare-url', {
    fileName: safeName,
    fileType: file.mimeType,
    folder: 'support-tickets',
  });
  const { uploadUrl, fileUrl, key } = presign.data;
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    const res = await fetch(uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': file.mimeType } });
    if (!res.ok) throw new Error('Upload failed');
  } else {
    const res = await FileSystem.uploadAsync(uploadUrl, file.uri, {
      httpMethod: 'PUT',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: { 'Content-Type': file.mimeType },
    });
    if (res.status < 200 || res.status >= 300) throw new Error('Upload failed');
  }
  return { url: fileUrl, key, format: file.mimeType, size: file.size || 0 };
}
