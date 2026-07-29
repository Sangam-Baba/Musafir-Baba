import { create } from 'zustand';
import { getItem, setItem, removeItem } from '../utils/storage';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  setToken: (token: string) => {
    setItem('partner_token', token);
    set({ token, isAuthenticated: true });
  },
  logout: () => {
    removeItem('partner_token');
    set({ token: null, isAuthenticated: false });
  },
  initialize: () => {
    const token = getItem('partner_token');
    if (token) {
      set({ token, isAuthenticated: true });
    }
  },
}));
