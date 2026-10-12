import { apiClient } from './axios';

// Home carousel banners + "Important Update" (backend: /api/app-home, managed in admin).

export type BannerScreen = 'TOURS' | 'VISA' | 'CAB' | 'SUPPORT' | 'NOTIFICATIONS';

export interface AppBanner {
  id: string;
  title: string;
  imageUrl: string;
  width: number;
  height: number;
  action: { type: 'NONE' | 'SCREEN' | 'URL'; screen: BannerScreen | null; url: string | null };
}

export interface AppAnnouncement {
  id: string;
  headline: string;
  message: string;
  createdAt?: string;
}

export const getAppHome = () =>
  apiClient.get<{ success: boolean; data: { banners: AppBanner[]; announcement: AppAnnouncement | null } }>('/app-home');
