import { create } from "zustand"
import { persist } from "zustand/middleware" // optional if you want user info persisted

interface User {
  id: string
  name?: string
  email?: string
}

interface AuthState {
  accessToken: string | null
  // user: User | null
  isAuthenticated: boolean
  setAuth: (token: string) => void
  clearAuth: () => void
  logout:() => Promise<void>
  refreshAccessToken: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      // user: null,
      isAuthenticated: false,

      setAuth: (token) => {
        set({ accessToken: token, isAuthenticated: true })
      },

      clearAuth: () => {
        set({ accessToken: null, isAuthenticated: false })
      },
      
      logout: async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/logout`, {
            method: "POST",
            credentials: "include",// ⬅️ very important, sends HttpOnly cookie
            headers: { "Content-Type": "application/json" },          
          })
          get().clearAuth()
        } catch (err) {
          console.error("Logout failed", err)
        }
      },
      refreshAccessToken: async () => {
        try {
          // 👇 Backend sends new access token, refresh handled by HttpOnly cookie
          const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",// ⬅️ very important, sends HttpOnly cookie
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: get().accessToken }), 
          })

          if (!res.ok) throw new Error("Failed to refresh token")

          const data = await res.json()
          set({
            accessToken: data.accessToken,
            isAuthenticated: true,
            // optionally also refresh user data here
          })
        } catch (err) {
          console.error("Refresh failed", err)
          get().clearAuth()
        }
      },
    }),
    {
      name: "auth-store", // persist user (not token)
      partialize: (state) => ({accessToken: state.accessToken, isAuthenticated: state.isAuthenticated }),
    }
  )
)
