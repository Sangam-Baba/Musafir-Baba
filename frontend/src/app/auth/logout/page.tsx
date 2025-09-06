"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { toast } from "sonner";

export default function LogoutPage() {
  const router = useRouter();
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await logout();                    // calls backend and clears client state
        if (!cancelled) {
          toast.success("Logged out");
          router.replace("/");             // immediate, replaces history
        }
      } catch (err) {
        console.error("Logout failed:", err);
        if (!cancelled) {
          toast.error("Logout failed — please try again");
          router.replace("/");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [logout, router]);

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <svg
        className="animate-spin h-8 w-8 mb-4"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <p className="text-sm text-gray-700">Logging out…</p>
    </div>
  );
}
