import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/common/Header";
import "../globals.css";
import Footer from "@/components/common/Footer";
import Script from "next/script";
export const metadata: Metadata = {
  title: "Musafirbaba - Best Travel Agency in Delhi | Holidays | Visa",
  description:
    "Looking for the best travel agency in Delhi? MusafirBaba offers exclusive holidays & trusted visa services. Book your tour now in just 60 seconds.",
  alternates: {
    canonical: "https://musafirbaba.com/",
  },
  openGraph: {
    title: " BEST TRAVEL AGENCY / TOUR PACKAGE & VISA / MUSAFIR BABA",
    description:
      "Looking for the best travel agency in Delhi? Unforgettable tour packages & hassle free visa services with Musafirbaba. Get a free quote today.",
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
    icon: "../favicon.ico", // default
    shortcut: "../favicon.ico", // for older browsers
  },
  verification: {
    google: "8Ft_waDuE7XSNxKBK_Qeng07HW9LwdunSYzZeCclHHY",
  },
};

import { RootProvider } from "@/providers/root-provider";
import GTMProvider from "@/providers/GTMProvider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Google Tag Manager Script */}
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
              new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
              j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
              'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','GTM-KW5RGQR6');`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
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
          <main className="flex-grow">{children}</main>
          <Footer />
          <Toaster />
          <GTMProvider />
        </RootProvider>
      </body>
    </html>
  );
}
