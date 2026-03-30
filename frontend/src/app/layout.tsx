import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
  verification: {
    google: "8Ft_waDuE7XSNxKBK_Qeng07HW9LwdunSYzZeCclHHY",
  },
};

import { Poppins } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-poppins",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${poppins.variable}`}>
      <body className="min-h-screen flex flex-col">{children}</body>
    </html>
  );
}
