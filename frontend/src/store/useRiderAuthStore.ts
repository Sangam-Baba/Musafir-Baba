import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface RiderProfileDto {
  fullName?: string;
  email?: string;
  mobileNumber?: string;
  profilePicture?: string;
}

interface RiderAuthState {
  riderAccessToken: string | null;
  riderRefreshToken: string | null;
  profile: RiderProfileDto | null;
  isRiderAuthenticated: boolean;
  setRiderAuth: (
    accessToken: string,
    refreshToken: string | null,
    profile?: RiderProfileDto | null,
  ) => void;
  clearRiderAuth: () => void;
}

// Independent from useAuthStore/useAdminAuthStore: the ride-hailing backend
// authenticates riders through a separate JWT system (see riderAuth.middleware.js),
// so this deliberately does not share state, storage key, or token shape with
// the site's existing account login.
export const useRiderAuthStore = create<RiderAuthState>()(
  persist(
    (set) => ({
      riderAccessToken: null,
      riderRefreshToken: null,
      profile: null,
      isRiderAuthenticated: false,

      setRiderAuth: (accessToken, refreshToken, profile) =>
        set({
          riderAccessToken: accessToken,
          riderRefreshToken: refreshToken,
          profile: profile ?? null,
          isRiderAuthenticated: true,
        }),

      clearRiderAuth: () =>
        set({
          riderAccessToken: null,
          riderRefreshToken: null,
          profile: null,
          isRiderAuthenticated: false,
        }),
    }),
    {
      name: "rider-auth-store",
    },
  ),
);
