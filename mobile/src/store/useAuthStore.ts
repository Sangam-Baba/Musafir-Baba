import { create } from 'zustand';
import { getItem, setItem, removeItem } from '../utils/storage';
import { API_BASE_URL } from '../utils/config';

export interface PartnerProfile {
  name?: string;
  mobile?: string;
  email?: string;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  profile: PartnerProfile | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setToken: (token: string) => Promise<void>;
  setProfile: (profile: PartnerProfile | null) => void;
  setOnboardingComplete: (status: boolean) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  profile: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  setToken: async (token: string) => {
    await setItem('partner_token', token);
    set({ token, isAuthenticated: true });
  },
  setProfile: (profile: PartnerProfile | null) => {
    set({ profile });
  },
  setOnboardingComplete: async (status: boolean) => {
    await setItem('onboarding_complete', status ? 'true' : 'false');
    set({ hasCompletedOnboarding: status });
  },
  logout: async () => {
    const token = get().token;
    try {
      if (token) {
        await fetch(`${API_BASE_URL}/partner/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout API Call Error:', error);
    } finally {
      await removeItem('partner_token');
      await removeItem('onboarding_complete');
      set({ token: null, profile: null, isAuthenticated: false, hasCompletedOnboarding: false });
    }
  },
  initialize: async () => {
    const token = await getItem('partner_token');
    const onboardingStatus = await getItem('onboarding_complete');
    if (token) {
      set({ 
        token, 
        isAuthenticated: true,
        hasCompletedOnboarding: onboardingStatus === 'true'
      });
    }
  },
}));

