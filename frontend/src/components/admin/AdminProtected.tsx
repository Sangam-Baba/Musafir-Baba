"use client";
import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAdminAuthStore } from "@/store/useAdminAuthStore";
import { Loader } from "@/components/custom/loader";
import { toast } from "sonner";
import { NAV_GROUPS } from "@/config/navigation";

export default function AdminProtected({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  // 1. Immediate Bypass for Login/Logout pages
  // This ensures they render instantly without any auth checks or loaders
  if (pathname === "/admin/login" || pathname === "/admin/logout") {
    return <>{children}</>;
  }

  const { accessToken, refreshAccessToken, clearAuth, role, permissions } = useAdminAuthStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

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
          if (user.data.role !== "admin" && user.data.role !== "superadmin" && user.data.role !== "staff") {
            clearAuth();
            toast.error("You are not authorized to access this page.");
            router.replace("/admin/login");
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
            `${process.env.NEXT_PUBLIC_BASE_URL}/admin/me`,
            {
              headers: { Authorization: `Bearer ${newToken}` },
              credentials: "include",
            }
          );

          if (meRes2.ok) {
            const user = await meRes2.json();
            if (user.data.role !== "admin" && user.data.role !== "superadmin" && user.data.role !== "staff") {
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
  }, [accessToken, clearAuth, refreshAccessToken, router]);

  if (loading) return <Loader />;

  // Path-based permission check
  // Skip check for superadmin/admin or specific excluded paths
  const userRole = role;
  const userPermissions = permissions || [];
  
  if (userRole !== "superadmin" && userRole !== "admin") {
    const isExcluded = pathname === "/admin" || pathname === "/admin/login" || pathname === "/admin/logout" || pathname === "/admin/update-password";
    
    if (!isExcluded) {
      // Find if this path matches any NAV_GROUP item (longest match first)
      const allItems = NAV_GROUPS.flatMap(g => g.items).sort((a, b) => b.href.length - a.href.length);
      const matchedItem = allItems.find(item => {
        if (item.href === "/admin") return pathname === "/admin"; // Exact match for root
        return pathname.startsWith(item.href);
      });
      
      if (matchedItem && !userPermissions.includes(matchedItem.permission)) {
        return (
          <div className="flex flex-col items-center justify-center min-h-screen bg-white p-6">
            <h1 className="text-2xl font-bold text-red-600 mb-4 flex items-center gap-2">
              <span className="p-2 bg-red-50 rounded-full">🚫</span>
              Access Denied
            </h1>
            <p className="text-slate-600 mb-6 text-center max-w-md">
              You do not have permission to access the <strong>{matchedItem.label}</strong> module. 
              Please contact your administrator if you believe this is an error.
            </p>
            <button 
              onClick={() => router.replace("/admin")}
              className="px-8 py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
            >
              Back to Dashboard
            </button>
          </div>
        );
      }
    }
  }

  return <>{children}</>;
}
