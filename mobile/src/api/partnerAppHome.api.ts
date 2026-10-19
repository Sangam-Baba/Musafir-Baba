import { apiClient } from './axios';

// Home carousel banners + "Important Update" for MBConnect
// (backend: /api/partner-app-home, managed in admin → Connect App Home).

export type PartnerBannerScreen = 'WALLET' | 'REFER_EARN' | 'BOOKINGS' | 'EARNINGS' | 'DOCUMENTS' | 'VEHICLES' | 'SUPPORT' | 'INBOX';

export interface PartnerAppBanner {
  id: string;
  title: string;
  imageUrl: string;
  width: number;
  height: number;
  action: { type: 'NONE' | 'SCREEN' | 'URL'; screen: PartnerBannerScreen | null; url: string | null };
}

export interface PartnerAppAnnouncement {
  id: string;
  headline: string;
  message: string;
  createdAt?: string;
}

export interface PartnerAppHome {
  banners: PartnerAppBanner[];
  announcement: PartnerAppAnnouncement | null;
}

// Last loaded content, so returning to Home doesn't flash the built-in banners.
export const partnerAppHomeCache: PartnerAppHome = { banners: [], announcement: null };

export const loadPartnerAppHome = async (): Promise<PartnerAppHome> => {
  const res = await apiClient.get<{ success: boolean; data: PartnerAppHome }>('/partner-app-home');
  const d = res.data?.data;
  partnerAppHomeCache.banners = Array.isArray(d?.banners) ? d.banners.filter((b) => !!b?.imageUrl) : [];
  partnerAppHomeCache.announcement = d?.announcement || null;
  return { ...partnerAppHomeCache };
};
