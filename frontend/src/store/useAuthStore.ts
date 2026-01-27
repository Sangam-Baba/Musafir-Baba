import { create } from "zustand";
import { persist } from "zustand/middleware"; // optional if you want user info persisted

interface AuthState {
  accessToken: string | null;
  role: string | null;
  name: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, role: string, name?: string) => void;
  clearAuth: () => void;
  logout: (token: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      role: null,
      name: null,
      permissions: [],
      isAuthenticated: false,

      setAuth: (token, role, name) => {
        set({
          accessToken: token,
          role: role,
          isAuthenticated: true,
          name: name,
        });
      },

      clearAuth: () => {
        set({
          accessToken: null,
          role: null,
          isAuthenticated: false,
          name: null,
        });
      },

      logout: async (token: string) => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/logout`, {
            method: "POST",
            credentials: "include", // ⬅️ very important, sends HttpOnly cookie
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          get().clearAuth();
        } catch (err) {
          console.error("Logout failed", err);
        }
      },
      refreshAccessToken: async () => {
        try {
          // 👇 Backend sends new access token, refresh handled by HttpOnly cookie
          const res = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/auth/refresh`,
            {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
            },
          );

          if (!res.ok) throw new Error("Failed to refresh token");

          const data = await res.json();
          set({
            accessToken: data.accessToken,
            isAuthenticated: true,
            role: data.role,
            name: data.name,
            // optionally also refresh user data here
          });
        } catch (err) {
          console.error("Refresh failed", err);
          // get().clearAuth();
        }
      },
    }),
    {
      name: "auth-store", // persist user (not token)
      partialize: (state) => ({
        accessToken: state.accessToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        name: state.name,
      }),
    },
  ),
);
