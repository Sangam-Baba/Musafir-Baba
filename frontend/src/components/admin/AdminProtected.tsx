"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";

export default function AdminProtected({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { accessToken, refreshAccessToken, clearAuth } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    if (pathname === "/admin/login") {
      if (mounted) setLoading(false);
      return;
    }

    async function bootstrap() {
      try {
        let token = accessToken;
        // Step 1: If no token in store, try refresh
        if (!token) {
          await refreshAccessToken();
          token = useAdminAuthStore.getState().accessToken;
        }

        // Step 2: If still no token → logout & redirect
        if (!token) {
          clearAuth();
          router.replace("/admin/login");
          return;
        }

        // Step 3: Verify token with /auth/me
        const meRes = await fetch(
          `${process.env.NEXT_PUBLIC_BASE_URL}/admin/me`,
          {
            headers: { Authorization: `Bearer ${token}` },
            credentials: "include",
          }
        );

        if (meRes.ok) {
          const user = await meRes.json();
          if (user.data.role !== "admin" && user.data.role !== "superadmin") {
            clearAuth();
            toast.error("You are not authorized to access this page.");
            router.replace("/auth/login");
            return;
          }
          if (mounted) setLoading(false);
          return;
        }

        // Step 4: If unauthorized, try one refresh + retry
        if (meRes.status === 401) {
          await refreshAccessToken();
          const newToken = useAdminAuthStore.getState().accessToken;

          if (!newToken) {
            clearAuth();
            router.replace("/admin/login");
            return;
          }

          const meRes2 = await fetch(
            `${process.env.NEXT_PUBLIC_BASE_URL}/auth/me`,
            {
              headers: { Authorization: `Bearer ${newToken}` },
              credentials: "include",
            }
          );

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
        router.replace("/");
      } catch (err) {
        console.error("AdminProtected error", err);
        clearAuth();
        router.replace("/");
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
