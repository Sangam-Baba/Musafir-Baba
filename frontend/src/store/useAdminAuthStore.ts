import { create } from "zustand";
import { persist } from "zustand/middleware"; // optional if you want user info persisted

interface AdminAuthState {
  accessToken: string | null;
  role: string | null;
  permissions?: string[];
  isAuthenticated: boolean;
  setAuth: (token: string, role: string, permissions?: string[]) => void;
  clearAuth: () => void;
  logout: (token: string) => Promise<void>;
  refreshAccessToken: () => Promise<void>;
}

export const useAdminAuthStore = create<AdminAuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      role: null,
      permissions: [],
      isAuthenticated: false,

      setAuth: (token, role, permissions) => {
        set({
          accessToken: token,
          role: role,
          isAuthenticated: true,
          permissions: permissions,
        });
      },

      clearAuth: () => {
        set({
          accessToken: null,
          role: null,
          isAuthenticated: false,
          permissions: [],
        });
      },

      logout: async (token: string) => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/admin/logout`, {
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
            `${process.env.NEXT_PUBLIC_BASE_URL}/admin/refresh`,
            {
              method: "POST",
              credentials: "include", // ⬅️ very important, sends HttpOnly cookie
              headers: { "Content-Type": "application/json" },
            }
          );

          if (!res.ok) throw new Error("Failed to refresh token");

          const data = await res.json();
          set({
            accessToken: data.accessToken,
            isAuthenticated: true,
            role: data.role,
            permissions: data.permissions,
            // optionally also refresh user data here
          });
        } catch (err) {
          console.error("Refresh failed", err);
          get().clearAuth();
        }
      },
    }),
    {
      name: "admin-auth-store", // persist user (not token)
      partialize: (state) => ({
        accessToken: state.accessToken,
        role: state.role,
        isAuthenticated: state.isAuthenticated,
        permissions: state.permissions,
      }),
    }
  )
);
