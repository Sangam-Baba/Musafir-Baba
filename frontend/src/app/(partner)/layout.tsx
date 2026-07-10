import React from "react";
import Header from "@/components/common/Header";
import Footer from "@/components/common/Footer";
import { RootProvider } from "@/providers/root-provider";
import { Toaster } from "@/components/ui/sonner";
import "../globals.css";

// Isolated layout for the Partner Dashboard / Registration
// This allows the entire (partner) route group to have a separate UI,
// separate authentication context, and be easily extracted to partner.musafirbaba.com
export default function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RootProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <Header />

        <main className="flex-1 flex flex-col items-center justify-center p-4 pt-24 pb-12">
          {children}
        </main>

        <Footer />
        <Toaster />
      </div>
    </RootProvider>
  );
}
