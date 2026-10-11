// Where a notification belongs and which screen it opens (used by the
// Notifications screen and by taps on phone push notifications).
import { getVisaApp } from '../api/visa.api';
import { getTourAppBooking } from '../api/tour.api';
import { useVisaStore } from '../store/useVisaStore';
import { useTourStore } from '../store/useTourStore';
import { useSupportStore } from '../store/useSupportStore';

export type NotificationCategory = 'RIDE' | 'TOUR' | 'VISA' | 'SUPPORT' | 'CANCELLATION' | 'PAYMENT' | 'DOCUMENT' | 'UPDATE';

const id = (v: any) => (v == null ? '' : String(v));

export function getNotificationCategory(n: { type?: string; data?: Record<string, any> }): NotificationCategory {
  const d = n.data || {};
  if (d.supportTicketId) return 'SUPPORT';
  if (d.cancellationId) return 'CANCELLATION';
  if (d.visaApplicationId) return 'VISA';
  if (d.tourBookingId) return 'TOUR';
  if (d.rideId) return n.type === 'Payment' ? 'PAYMENT' : 'RIDE';
  if (n.type === 'Payment' || n.type === 'Payout') return 'PAYMENT';
  if (n.type === 'Document' || d.isVerified !== undefined) return 'DOCUMENT';
  if (n.type === 'Ride' || n.type === 'Trip') return 'RIDE';
  return 'UPDATE';
}

// Opens the screen for a notification's data. Returns false if there's nowhere to go.
export async function openNotificationTarget(n: { type?: string; data?: Record<string, any> }, navigate: (screen: string) => void): Promise<boolean> {
  const d = n.data || {};
  const category = getNotificationCategory(n);
  try {
    if (category === 'SUPPORT') {
      useSupportStore.getState().openTicket(id(d.supportTicketId));
      navigate('support-ticket');
      return true;
    }
    if (category === 'VISA') {
      const res = await getVisaApp(id(d.visaApplicationId));
      useVisaStore.getState().setViewedApp(res.data.data);
      navigate('visa-application');
      return true;
    }
    if (category === 'TOUR') {
      const res = await getTourAppBooking(id(d.tourBookingId));
      useTourStore.getState().setViewedBooking(res.data.data);
      navigate('tour-booking-detail');
      return true;
    }
    if (category === 'DOCUMENT') {
      navigate('41');
      return true;
    }
    if (category === 'RIDE' || category === 'CANCELLATION' || category === 'PAYMENT') {
      navigate('35');
      return true;
    }
  } catch {
    // The booking may have been removed -- fall back to My Trips.
    navigate('35');
    return true;
  }
  return false;
}
