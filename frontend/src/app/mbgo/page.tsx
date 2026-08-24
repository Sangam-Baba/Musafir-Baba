import type { Metadata } from "next";
import Script from "next/script";
import MBGoHero from "@/components/mbgo/MBGoHero";
import MBGoServices from "@/components/mbgo/MBGoServices";
import WhyChooseMBGo from "@/components/mbgo/WhyChooseMBGo";
import MBGoHowItWorks from "@/components/mbgo/MBGoHowItWorks";
import MBConnectCrossPromo from "@/components/mbgo/MBConnectCrossPromo";
import MBGoTrustStats from "@/components/mbgo/MBGoTrustStats";
import MBGoFAQSection from "@/components/mbgo/MBGoFAQSection";
import { getOrganizationSchema } from "@/lib/schema/organization.schema";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "MBGo by MusafirBaba - Book Local Rides, Outstation Cabs, Airport Transfers & Car Rentals";
const DESCRIPTION =
  "MBGo is the smart mobility app by MusafirBaba. Book local city rides, outstation cabs, airport taxi transfers, and car rentals across India with verified drivers and 100% transparent pricing.";

const FAQ_SCHEMA_ITEMS = [
  {
    q: "What is MBGo by MusafirBaba?",
    a: "MBGo is a smart mobility and ride-booking app by MusafirBaba that provides local city rides, outstation one-way and round trips, airport transfers, and car rentals across India with verified drivers and transparent pricing.",
  },
  {
    q: "How do I book a ride on MBGo?",
    a: "You can enter your pickup location, destination, and preferred date/time on the booking widget above, or download the MBGo app on Android (Google Play) and iOS (App Store) for instant one-tap booking and live ride tracking.",
  },
  {
    q: "Are prices fixed or are there hidden charges?",
    a: "MBGo offers 100% transparent pricing with zero hidden fees. Tolls, driver allowances, and taxes are clearly indicated before you confirm your ride.",
  },
  {
    q: "What safety features does MBGo have?",
    a: "All MBGo drivers undergo thorough background verification and training. Trips include live GPS tracking, 24x7 customer support, and emergency SOS assistance directly within the app.",
  },
  {
    q: "Can I book outstation cabs for one-way journeys?",
    a: "Yes! MBGo offers one-way outstation cab booking so you only pay for the distance you travel, saving you up to 50% compared to traditional round-trip charges.",
  },
  {
    q: "How do I join as a driver or vehicle partner?",
    a: "If you are a driver or vehicle owner, you can join MBConnect (our dedicated partner platform) by visiting /mbconnect to start earning with weekly payouts and flexible hours.",
  },
];

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "MBGo, MusafirBaba cab app, book cab online India, outstation cab booking, airport taxi service, car rental India, local taxi app, one way cab",
  alternates: {
    canonical: "https://musafirbaba.com/mbgo",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbgo",
    siteName: "MusafirBaba",
    type: "website",
    images: [
      {
        url: "https://musafirbaba.com/homebanner007.avif",
        width: 1200,
        height: 630,
        alt: "MBGo - Smart Mobility & Ride Booking App by MusafirBaba",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://musafirbaba.com/homebanner007.avif"],
  },
};

export default function MBGoPage() {
  const organizationSchema = getOrganizationSchema();
  const webPageSchema = getWebPageSchema(TITLE, "mbgo");
  const breadcrumbSchema = getBreadcrumbSchema("mbgo");

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_SCHEMA_ITEMS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  const softwareAppSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "MBGo",
    operatingSystem: "Android, iOS",
    applicationCategory: "TravelApplication",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
    },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "4.7",
      ratingCount: "50000",
      bestRating: "5",
      worstRating: "1",
    },
    publisher: {
      "@type": "Organization",
      name: "MusafirBaba Travels Pvt. Ltd.",
      url: "https://musafirbaba.com",
    },
  };

  return (
    <>
      {/* MBGoHero renders the page's single, semantic <h1> */}
      <MBGoHero />
      <MBGoServices />
      <WhyChooseMBGo />
      <MBGoHowItWorks />
      <MBConnectCrossPromo />
      <MBGoTrustStats />
      <MBGoFAQSection />

      {/* JSON-LD Structured Data */}
      <Script
        id="mbgo-organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="mbgo-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbgo-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="mbgo-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="mbgo-software-app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareAppSchema) }}
      />
    </>
  );
}
