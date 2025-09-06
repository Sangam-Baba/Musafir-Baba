import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"
import  Header  from "../components/common/Header"
//import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Footer from "../components/common/Footer";

export const metadata: Metadata = {
  title: "Musafirbaba Tour and Travel Agency",
  description: "Welcome to Musafirbaba Tour and Travel Agency",
};

import { RootProvider } from "@/providers/root-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col">
        <RootProvider>
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
          <Toaster />
        </RootProvider>
      </body>
    </html>
  );
}

