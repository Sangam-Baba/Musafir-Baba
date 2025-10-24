import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Header from "@/components/common/Header";
import "../globals.css";
import Footer from "@/components/common/Footer";
import Script from "next/script";
import WhatsAppButton from "@/components/common/WhatsappButton";
export const metadata: Metadata = {
  title: "MusafirBaba - Best Travel Agency in Delhi | Holidays | Visa",
  description:
    "Looking for the best travel agency in Delhi? MusafirBaba offers exclusive holidays & trusted visa services. Book your tour now in just 60 seconds.",
  alternates: {
    canonical: "https://musafirbaba.com/",
  },
  openGraph: {
    title: "Musafirbaba - Best Travel Agency in Delhi | Holidays | Visa",
    description:
      "Looking for the best travel agency in Delhi? MusafirBaba offers exclusive holidays & trusted visa services. Book your tour now in just 60 seconds.",
    url: "https://musafirbaba.com/",
    siteName: "MusafirBaba",
    images: [
      {
        url: "https://musafirbaba.com/logo.svg", // replace with your image
        width: 1200,
        height: 630,
        alt: "MusafirBaba Travel",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Musafirbaba - Best Travel Agency in Delhi | Holidays | Visa",
    description:
      "Looking for the best travel agency in Delhi? MusafirBaba offers exclusive holidays & trusted visa services.",
    images: ["https://musafirbaba.com/logo.svg"], // recommended 1200x630
    creator: "@", // optional
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
import { AuthDialog } from "@/components/auth/AuthDialog";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MusafirBaba",
    url: "https://musafirbaba.com/",
    logo: "https://musafirbaba.com/logo.svg",
    sameAs: [
      "https://www.facebook.com/hellomusafirbaba",
      "https://x.com/itsmusafirbaba",
      "https://www.instagram.com/hello_musafirbaba",
      "http://www.youtube.com/@hello_musafirbaba",
      "https://www.linkedin.com/company/musafirbaba",
      "https://pin.it/1rMQjjMRE",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+91-92896 02447",
      contactType: "Customer Service",
      areaServed: "IN",
      availableLanguage: "English",
    },
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "MusafirBaba",
    image: "https://musafirbaba.com/logo.svg",
    "@id": "https://musafirbaba.com/",
    url: "https://musafirbaba.com/",
    telephone: "+91-92896 02447",
    priceRange: "₹5,000–₹20,000",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "Plot no. 2 & 3, 1st Floor, Khaira Mor, Near Dhansa Bus Stand Metro Station, Gate no. 1, Najafgarh",
      addressLocality: "New Delhi",
      postalCode: "110043",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "28.6116406",
      longitude: "76.9756233",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "19:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/hellomusafirbaba",
      "https://x.com/itsmusafirbaba",
      "https://www.instagram.com/hello_musafirbaba",
      "http://www.youtube.com/@hello_musafirbaba",
      "https://www.linkedin.com/company/musafirbaba",
      "https://pin.it/1rMQjjMRE",
    ],
  };
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          rel="preconnect"
          href="https://musafir-baba-backend.onrender.com"
        />
        <link
          rel="dns-prefetch"
          href="https://musafir-baba-backend.onrender.com"
        />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
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
          <main className="flex-grow">
            {children}
            <WhatsAppButton />
          </main>
          <Script
            id="organization-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(organizationSchema),
            }}
          />
          <Script
            id="local-business-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify(localBusinessSchema),
            }}
          />
          <AuthDialog />
          <Footer />
          <Toaster />
          <GTMProvider />
        </RootProvider>
      </body>
    </html>
  );
}
