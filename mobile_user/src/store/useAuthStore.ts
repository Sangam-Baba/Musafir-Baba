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
  profile: RiderProfile | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  setToken: (token: string) => Promise<void>;
  setProfile: (profile: RiderProfile | null) => void;
  logout: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: null,
  profile: null,
  isAuthenticated: false,
  isInitializing: true,
  setToken: async (token: string) => {
    await setItem('rider_token', token);
    set({ token, isAuthenticated: true });
  },
  setProfile: (profile: RiderProfile | null) => {
    set({ profile });
  },
  logout: async () => {
    try {
      await apiClient.post('/rider/auth/logout');
    } catch (error) {
      console.error('Logout API Call Error:', error);
    } finally {
      await removeItem('rider_token');
      set({ token: null, profile: null, isAuthenticated: false });
    }
  },
  initialize: async () => {
    const token = await getItem('rider_token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
    set({ isInitializing: false });
  },
}));
