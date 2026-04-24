import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/common/Header";
import "../globals.css";
import Footer from "@/components/common/Footer";
import Script from "next/script";
import WhatsAppButton from "@/components/common/WhatsappButton";

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
import { AuthDialog } from "@/components/auth/AuthDialog";
import { QueryDailogBox } from "@/components/common/QueryDailogBox";
import PlanMyTrip from "@/components/common/Plan-My-Trip";
import MobileBottom from "@/components/custom/MobileBottom";

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
      {/* Preload hero image for LCP — critical for fast paint */}
      <link
        rel="preload"
        as="image"
        type="image/webp"
        href="/homebanner.webp"
      />
      {/* GTM: dns-prefetch only (not preconnect) to avoid blocking */}
      <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
      <link rel="dns-prefetch" href="https://static.doubleclick.net" />

      {/* Google Tag Manager Script — lazyOnload for mobile thread freedom */}
      <Script
        id="gtm-script"
        strategy="lazyOnload"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KW5RGQR6');`,
        }}
      />

      {/* Google Tag Manager (noscript) */}
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-KW5RGQR6"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        ></iframe>
      </noscript>
      <RootProvider>
        <Header />
        <main className="flex-grow">
          {children}
          {/* <PlanMyTrip /> */}
          <QueryDailogBox />
          <WhatsAppButton />
          <MobileBottom />
        </main>
        <AuthDialog />
        <Footer />
        <Toaster />
        <GTMProvider />
      </RootProvider>
    </>
  );
}
