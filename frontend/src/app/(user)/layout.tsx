import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/common/Header";
import "../globals.css";
import Footer from "@/components/common/Footer";
import Script from "next/script";
import dynamic from "next/dynamic";
const WhatsAppButton = dynamic(() => import("@/components/common/WhatsappButton"));
const MobileBottom = dynamic(() => import("@/components/custom/MobileBottom"));

export const metadata: Metadata = {
  title: "MusafirBaba - Best Travel Agency in India | Holidays | Visas",
  description:
    "Most trusted travel agency in India for holidays, tour packages, and visa services. Expert guidance for hassle-free travel.",
  keywords: [
    "Best Travel Agency in India",
    "India Tour Packages",
    "Holiday Packages India",
    "International Tour Packages",
  ],
  alternates: {
    canonical: "https://musafirbaba.com",
  },
  openGraph: {
    title: "MusafirBaba - Best Travel Agency in India | Holidays | Visas",
    description:
      "Most trusted travel agency in India for holidays, tour packages, and visa services. Expert guidance for hassle-free travel.",
    url: "https://musafirbaba.com",
    siteName: "MusafirBaba",
    images: [
      {
        url: "https://musafirbaba.com/homebanner.webp",
        width: 1200,
        height: 630,
        alt: "MusafirBaba Travel",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Musafirbaba - Best Travel Agency in India | Holidays | Visa",
    description:
      "Most trusted travel agency in India for holidays, tour packages, and visa services. Expert guidance for hassle-free travel.",
    images: ["https://musafirbaba.com/homebanner.webp"],
    creator: "@",
  },
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  verification: {
    google: "8Ft_waDuE7XSNxKBK_Qeng07HW9LwdunSYzZeCclHHY",
  },
};

import { RootProvider } from "@/providers/root-provider";
import GTMProvider from "@/providers/GTMProvider";
import { LazyAuthDialog } from "@/components/auth/LazyAuthDialog";
import { QueryDailogBox } from "@/components/common/QueryDailogBox";
import PlanMyTrip from "@/components/common/Plan-My-Trip";
import GTMInjector from "@/components/common/GTMInjector";


export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Only 2 preconnects max — Lighthouse flags 4+ as harmful */}
      <link rel="preconnect" href="https://musafir-baba-backend.onrender.com" />
      <link rel="dns-prefetch" href="https://musafir-baba-backend.onrender.com" />
      {/* GTM: dns-prefetch only (not preconnect) to avoid blocking */}
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://static.doubleclick.net" />

      {/* Google Tag Manager (Loaded on interaction) */}
      <GTMInjector />
      <RootProvider>
        <Header />
        <main className="flex-grow">
          {children}
          {/* <PlanMyTrip /> */}
          <QueryDailogBox />
          <WhatsAppButton />
          <MobileBottom />
        </main>
        <LazyAuthDialog />
        <Footer />
        <Toaster />
        <GTMProvider />
      </RootProvider>
    </>
  );
}
