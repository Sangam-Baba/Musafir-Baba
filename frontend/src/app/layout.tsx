import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Musafirbaba - Best Travel Agency in Delhi | Holidays | Visa",
  description:
    "Looking for the best travel agency in Delhi? MusafirBaba offers exclusive holidays & trusted visa services. Book your tour now in just 60 seconds.",
  alternates: {
    canonical: "https://musafirbaba.com/",
  },
  openGraph: {
    title: "BEST TRAVEL AGENCY / TOUR PACKAGE & VISA / MUSAFIR BABA",
    description:
      "Looking for the best travel agency in Delhi? Unforgettable tour packages & hassle free visa services with Musafirbaba. Get a free quote today.",
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
  icons: {
    icon: "/favicon.ico", // default
    shortcut: "/favicon.ico", // for older browsers
  },
  verification: {
    google: "8Ft_waDuE7XSNxKBK_Qeng07HW9LwdunSYzZeCclHHY",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
