import { FINANCIAL_FEATURES_ENABLED } from '../config/features';
import type { PartnerNotificationData } from '../api/partnerNotification.api';

// Where a partner notification opens (tab, optionally a Menu screen / Bookings filter).
export type NotificationTarget =
  | { tab: 'Home' }
  | { tab: 'Bookings'; filter?: 'All' | 'Ongoing' | 'Scheduled' | 'Completed' | 'Cancelled' | 'Available' }
  | { tab: 'Earnings' }
  | { tab: 'Menu'; screen: string };

export function getNotificationTarget(n: Pick<PartnerNotificationData, 'title' | 'type' | 'data'>): NotificationTarget {
  const title = (n.title || '').toLowerCase();
  const hasRide = !!n.data?.rideId;

  // Money
  if (n.type === 'Payout') {
    return FINANCIAL_FEATURES_ENABLED ? { tab: 'Menu', screen: 'PayoutHistory' } : { tab: 'Home' };
  }
  if (title.includes('fare pending') || title.includes('extra time')) {
    return FINANCIAL_FEATURES_ENABLED ? { tab: 'Earnings' } : { tab: 'Bookings', filter: 'Completed' };
  }

  // Rides
  if (title.includes('new ride available')) return { tab: 'Bookings', filter: 'Available' };
  if (title.includes('cancelled')) return { tab: 'Bookings', filter: 'Cancelled' };
  if (title.includes('assigned to you') || title.includes('details available')) return { tab: 'Bookings', filter: 'Scheduled' };
  if (hasRide || n.type === 'Trip') return { tab: 'Bookings', filter: 'All' };

  // Account / verification
  if (title.includes('approved') || title.includes('submitted')) return { tab: 'Menu', screen: 'VerifiedPartner' };
  if (title.includes('hold') || title.includes('rejected')) return { tab: 'Menu', screen: 'PersonalDetails' };
  if (n.type === 'Document') return { tab: 'Menu', screen: 'VerifiedPartner' };

  // Welcome / general: Home shows the account setup guide.
  return { tab: 'Home' };
}

export function openNotificationTarget(navigation: any, target: NotificationTarget) {
  if (target.tab === 'Menu') navigation.navigate('Menu', { screen: target.screen });
  else if (target.tab === 'Bookings') navigation.navigate('Bookings', target.filter ? { filter: target.filter } : undefined);
  else navigation.navigate(target.tab);
}
