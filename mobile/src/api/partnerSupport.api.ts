import { apiClient } from './axios';

// MBConnect Help Center tickets (backend: /api/partner/support/*). Admin
// handles them in admin > Support Tickets (filter "Drivers").

// Partner support contacts.
export const PARTNER_SUPPORT_PHONE = '+919289602447';
export const PARTNER_SUPPORT_PHONE_DISPLAY = '+91 92896 02447';
export const PARTNER_SUPPORT_EMAIL = 'care@musafirbaba.com';

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export interface PartnerTicket {
  _id: string;
  ticketId: string;
  issueKey: string;
  issueLabel: string;
  subject?: string;
  description: string;
  booking?: { code?: string; title?: string; subtitle?: string };
  status: TicketStatus;
  resolutionNote?: string;
  messages?: { _id: string; from: 'PARTNER' | 'ADMIN' | 'RIDER'; text?: string; staffName?: string; at: string }[];
  unread?: boolean;
  lastActivityAt: string;
  createdAt: string;
}

export interface SupportTrip {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  status: string;
}

export const getSupportCategories = () => apiClient.get<{ success: boolean; data: { key: string; label: string }[] }>('/partner/support/catalog');
export const getSupportTrips = () => apiClient.get<{ success: boolean; data: SupportTrip[] }>('/partner/support/trips');
export const getMyTickets = () => apiClient.get<{ success: boolean; data: PartnerTicket[] }>('/partner/support/tickets');
export const getTicket = (id: string) => apiClient.get<{ success: boolean; data: PartnerTicket }>(`/partner/support/tickets/${id}`);
export const createTicket = (body: { issueKey: string; subject: string; description: string; rideId?: string }) =>
  apiClient.post<{ success: boolean; data: PartnerTicket; message?: string }>('/partner/support/tickets', body);
export const replyToTicket = (id: string, text: string) =>
  apiClient.post<{ success: boolean; data: PartnerTicket }>(`/partner/support/tickets/${id}/messages`, { text });
