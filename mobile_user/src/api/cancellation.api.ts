import { apiClient } from './axios';

// Rider cancellations (backend: /api/cancellations).
export type CancelService = 'CAB' | 'TOUR' | 'VISA';
export interface CancelReason {
  key: string;
  label: string;
}
export interface CancelCheck {
  allowed: boolean;
  type?: 'INSTANT' | 'REQUEST';
  message?: string;
  isPaid: boolean;
  booking: { code: string; title: string; subtitle: string; status: string } | null;
}

export const getCancelReasons = (service: CancelService) =>
  apiClient.get<{ success: boolean; data: CancelReason[] }>('/cancellations/reasons', { params: { service } });
export const checkCancellation = (service: CancelService, bookingId: string) =>
  apiClient.get<{ success: boolean; data: CancelCheck }>('/cancellations/check', { params: { service, bookingId } });
export const createCancellation = (payload: { service: CancelService; bookingId: string; reasonKey: string; comment?: string }) =>
  apiClient.post<{ success: boolean; data: { requestId: string; type: 'INSTANT' | 'REQUEST'; status: string; isPaid: boolean; booking: CancelCheck['booking'] } }>('/cancellations', payload);

// Mirrors the server rules, only to decide whether to show a Cancel button
// (the server always re-checks).
const CAB_CANCELLABLE = ['PAYMENT_PENDING', 'PAID', 'AWAITING_ASSIGNMENT', 'ACCEPTED', 'DRIVER_EN_ROUTE', 'ARRIVED'];
export const canCancelRide = (ride: any) => CAB_CANCELLABLE.includes(ride?.status);
export const canCancelTour = (b: any) =>
  (b?.bookingStatus === 'Confirmed' || b?.bookingStatus === 'PaymentPending') &&
  b?.cancellation?.status !== 'REQUESTED' &&
  new Date(b?.startDate).getTime() > Date.now();
export const canCancelVisa = (a: any) =>
  !['Approved', 'Rejected', 'Cancelled'].includes(a?.applicationStatus) && a?.cancellation?.status !== 'REQUESTED';
