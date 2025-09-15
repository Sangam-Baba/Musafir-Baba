import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner"
import  Header  from "@/components/common/Header"
//import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Footer from "@/components/common/Footer";

export const metadata: Metadata = {
  title: "Best Travel Agency in Delhi | Tour Packages & Visas | Musafirbaba",
  description: "Looking for the best travel agency in Delhi? Unforgettable tour packages &amp; seamless visa services with Musafirbaba. Get a free quote today.",
  alternates: {
    canonical: "https://www.musafirbaba.com/",
  },
  openGraph: {
    title: " BEST TRAVEL AGENCY / TOUR PACKAGE & VISA / MUSAFIR BABA",
    description: "Looking for the best travel agency in Delhi? Unforgettable tour packages & hassle free visa services with Musafirbaba. Get a free quote today.",
    url: "https://musafirbaba.com/",
    siteName: "MusafirBaba",
    images: [
      {
        url: "https://musafirbaba.com/wp-content/uploads/2025/09/Untitled-design-3.png", // replace with your image
        width: 1200,
        height: 630,
        alt: "MusafirBaba Travel",
      },
    ],
    type: "website",
  },
    icons: {
    icon: "../favicon.ico",       // default
    shortcut: "../favicon.ico",   // for older browsers
  },
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

