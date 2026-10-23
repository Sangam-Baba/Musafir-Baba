import type { Metadata } from "next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://musafirbaba.com"),
  title: "MusafirBaba - Best Travel Agency in India | Holidays | Visas",
  description:
    "Most trusted travel agency in India for holidays, tour packages, and visa services. Expert guidance for hassle-free travel.",
  keywords:
    "Travel Agency, Tour Packages, Visa Services, Delhi, India, Holidays, Visa, Bookings",
  alternates: {
    canonical: "https://musafirbaba.com/",
  },
  openGraph: {
    title: "MusafirBaba - Best Travel Agency in India | Holidays | Visas",
    description:
      "Most trusted travel agency in India for holidays, tour packages, and visa services. Expert guidance for hassle-free travel.",
    url: "https://musafirbaba.com/",
    siteName: "MusafirBaba",
    images: [
      {
        url: "https://musafirbaba.com/homebanner.webp", // replace with your image
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
    images: ["https://musafirbaba.com/homebanner.webp"], // recommended 1200x630
    creator: "@", // optional
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: { url: "/favicon/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  manifest: "/favicon/site.webmanifest",
  verification: {
    google: "8Ft_waDuE7XSNxKBK_Qeng07HW9LwdunSYzZeCclHHY",
  },
};

import { Poppins, Inter, Playfair_Display } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-poppins",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-playfair",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable} ${inter.variable} ${playfair.variable}`}>
      <head>
        {/* Preconnect to external image and CDN domains */}
        <link rel="preconnect" href="https://cdn.musafirbaba.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://cdn.musafirbaba.com" />
        <link rel="preconnect" href="https://res.cloudinary.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        {/* AI Agent discovery link for LLMs */}
        <link rel="alternate" type="text/markdown" title="LLMs.txt" href="/llms.txt" />
      </head>
      <body className="min-h-screen flex flex-col font-sans">
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
