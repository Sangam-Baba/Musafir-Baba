import { create } from 'zustand';
import { getAppHome, type AppBanner, type AppAnnouncement } from '../api/appHome.api';

// Admin-managed Home content. Empty until loaded (or if the request fails),
// in which case Home looks exactly as it did before this feature.
interface AppHomeState {
  banners: AppBanner[];
  announcement: AppAnnouncement | null;
  load: () => Promise<void>;
  // Update to open/highlight on the Notifications screen (set by the Home bar
  // or a push tap); cleared by that screen.
  focusAnnouncement: Partial<AppAnnouncement> & { id: string } | null;
  setFocusAnnouncement: (a: (Partial<AppAnnouncement> & { id: string }) | null) => void;
}

export const useAppHomeStore = create<AppHomeState>((set) => ({
  banners: [],
  announcement: null,
  load: async () => {
    try {
      const res = await getAppHome();
      const d = res.data?.data;
      set({ banners: Array.isArray(d?.banners) ? d.banners.filter((b) => !!b.imageUrl) : [], announcement: d?.announcement || null });
    } catch (e) {
      console.log('Error loading app home content', e);
    }
  },
  focusAnnouncement: null,
  setFocusAnnouncement: (a) => set({ focusAnnouncement: a }),
}));
