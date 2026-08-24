import React from "react";
import { RootProvider } from "@/providers/root-provider";
import { Toaster } from "@/components/ui/sonner";
import MBGoNavbar from "@/components/mbgo/MBGoNavbar";
import MBGoFooter from "@/components/mbgo/MBGoFooter";
import "../globals.css";

export default function MBGoLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootProvider>
      <div className="min-h-screen flex flex-col font-sans bg-white">
        <MBGoNavbar />
        <main className="flex-1 flex flex-col w-full">{children}</main>
        <MBGoFooter />
        <Toaster />
      </div>
    </RootProvider>
  );
}
