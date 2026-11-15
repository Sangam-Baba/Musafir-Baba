// B2B business-user session (client only). The access token lives in memory only — never in
// localStorage — and is renewed from the HttpOnly refresh cookie when it expires or the page reloads.
import { create } from "zustand";

interface BusinessSessionState {
  accessToken: string | null;
  /** true while a MusafirBaba admin views an org: never fall back to this browser's own sign-in */
  viewAs: boolean;
  setAccessToken: (token: string | null) => void;
  startViewAs: (token: string) => void;
}

export const useBusinessSession = create<BusinessSessionState>()((set) => ({
  accessToken: null,
  viewAs: false,
  setAccessToken: (token) => set({ accessToken: token }),
  startViewAs: (token) => set({ accessToken: token, viewAs: true }),
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
