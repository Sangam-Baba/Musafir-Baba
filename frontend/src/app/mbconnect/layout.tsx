import React from "react";
import { RootProvider } from "@/providers/root-provider";
import { Toaster } from "@/components/ui/sonner";
import MBConnectNavbar from "@/components/mbconnect/MBConnectNavbar";
import MBConnectFooter from "@/components/mbconnect/MBConnectFooter";
import "../globals.css";

// Isolated layout for the MBConnect driver-partner landing page — same
// pattern as (partner)/layout.tsx. This route is a sibling of (user)/
// (partner)/admin, not nested inside any of them, so it never inherits the
// main site's Header/Footer/topbar/chat widgets — only its own navbar and
// footer below render here.
export default function MBConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootProvider>
      <div className="min-h-screen flex flex-col font-sans bg-white">
        <MBConnectNavbar />
        <main className="flex-1 flex flex-col w-full">{children}</main>
        <MBConnectFooter />
        <Toaster />
      </div>
    </RootProvider>
  );
}
