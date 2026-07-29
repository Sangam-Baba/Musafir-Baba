import { create } from 'zustand';
import { getItem, setItem, removeItem } from '../utils/storage';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  hasCompletedOnboarding: boolean;
  setToken: (token: string) => Promise<void>;
  setOnboardingComplete: (status: boolean) => Promise<void>;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  setToken: async (token: string) => {
    await setItem('partner_token', token);
    set({ token, isAuthenticated: true });
  },
  setOnboardingComplete: async (status: boolean) => {
    await setItem('onboarding_complete', status ? 'true' : 'false');
    set({ hasCompletedOnboarding: status });
  },
  logout: async () => {
    await removeItem('partner_token');
    await removeItem('onboarding_complete');
    set({ token: null, isAuthenticated: false, hasCompletedOnboarding: false });
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
