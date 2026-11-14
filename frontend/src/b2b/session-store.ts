// B2B business-user session (client only). The access token lives in memory only — never in
// localStorage — and is renewed from the HttpOnly refresh cookie when it expires or the page reloads.
import { create } from "zustand";

interface BusinessSessionState {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
}

export const useBusinessSession = create<BusinessSessionState>()((set) => ({
  accessToken: null,
  setAccessToken: (token) => set({ accessToken: token }),
}));

// MusafirBaba admins: the short-lived B2B admin pass (memory only; asked again after a reload).
interface AdminPassState {
  adminToken: string | null;
  mfaSetupRequiredBy: string | null;
  setPass: (token: string | null, mfaSetupRequiredBy?: string | null) => void;
}

export const useAdminPass = create<AdminPassState>()((set) => ({
  adminToken: null,
  mfaSetupRequiredBy: null,
  setPass: (token, mfaSetupRequiredBy = null) => set({ adminToken: token, mfaSetupRequiredBy }),
}));
