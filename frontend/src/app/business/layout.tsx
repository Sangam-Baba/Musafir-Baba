"use client";
// The business area (B2B clients and hotels) — its own login, separate from website customers and admins.
// Talks only to /api/v1 (the B2B API); nothing here touches the existing website pages.
import { Toaster } from "sonner";

import { RootProvider } from "@/providers/root-provider";

export default function BusinessLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootProvider>
      {children}
      <Toaster position="top-right" richColors />
    </RootProvider>
  );
}
