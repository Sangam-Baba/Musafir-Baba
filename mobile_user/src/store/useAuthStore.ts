import { create } from 'zustand';
import { getItem, setItem, removeItem } from '../utils/storage';
import { apiClient } from '../api/axios';

export interface RiderProfile {
  fullName?: string;
  mobileNumber?: string;
  profilePicture?: string;
  email?: string;
  walletBalance?: number;
  isEmailVerified?: boolean;
  [key: string]: any;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  profile: RiderProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setToken: (token: string, refreshToken?: string) => Promise<void>;
  setProfile: (profile: RiderProfile | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  refreshToken: null,
  profile: null,
  isAuthenticated: false,
  isInitializing: true,
  setToken: async (token: string, refreshToken?: string) => {
    await setItem('rider_token', token);
    if (refreshToken) {
      await setItem('rider_refresh_token', refreshToken);
      set({ token, refreshToken, isAuthenticated: true });
    } else {
      set({ token, isAuthenticated: true });
    }
  },
  setProfile: (profile: RiderProfile | null) => {
    set({ profile });
  },
  logout: async () => {
    try {
      await apiClient.post('/rider/auth/logout', { refreshToken: get().refreshToken });
    } catch (error) {
      console.error('Logout API Call Error:', error);
    } finally {
      await removeItem('rider_token');
      await removeItem('rider_refresh_token');
      set({ token: null, refreshToken: null, profile: null, isAuthenticated: false });
    }
  },
  initialize: async () => {
    const [token, refreshToken] = await Promise.all([
      getItem('rider_token'),
      getItem('rider_refresh_token'),
    ]);
    if (token) {
      set({ token, refreshToken, isAuthenticated: true });
    }
    set({ isInitializing: false });
  },
}));
