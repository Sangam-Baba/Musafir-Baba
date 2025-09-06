"use client";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { Loader } from "@/components/custom/loader";

export default function AdminProtected({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { accessToken, setAuth, refreshAccessToken, clearAuth } = useAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        let token = accessToken;

        // Step 1: If no token in store, try refresh
        if (!token) {
          await refreshAccessToken();
          token = useAuthStore.getState().accessToken;
        }

        // Step 2: If still no token → logout & redirect
        if (!token) {
          clearAuth();
          router.replace("/admin/login");
          return;
        }

        // Step 3: Verify token with /auth/me
        const meRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: "include",
        });

        if (meRes.ok) {
          const user = await meRes.json();
          if (user.role !== "admin" && user.role !== "superadmin") {
            clearAuth();
            router.replace("/admin/login");
            return;
          }
          if (mounted) setLoading(false);
          return;
        }

        // Step 4: If unauthorized, try one refresh + retry
        if (meRes.status === 401) {
          await refreshAccessToken();
          const newToken = useAuthStore.getState().accessToken;

          if (!newToken) {
            clearAuth();
            router.replace("/admin/login");
            return;
          }

          const meRes2 = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
            headers: { Authorization: `Bearer ${newToken}` },
            credentials: "include",
          });

          if (meRes2.ok) {
            const user = await meRes2.json();
            if (user.role !== "admin" && user.role !== "superadmin") {
              clearAuth();
              router.replace("/admin/login");
              return;
            }
            if (mounted) setLoading(false);
            return;
          }
        }

        // Step 5: Fallback → redirect
        clearAuth();
        router.replace("/admin/login");
      } catch (err) {
        console.error("AdminProtected error", err);
        clearAuth();
        router.replace("/admin/login");
      }
    }

    bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <Loader />;
  return <>{children}</>;
}
