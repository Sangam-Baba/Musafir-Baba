import type { Metadata } from "next";
import Script from "next/script";
import MBConnectHero from "@/components/mbconnect/MBConnectHero";
import WhyPartnerSection from "@/components/mbconnect/WhyPartnerSection";
import HowItWorksSection from "@/components/mbconnect/HowItWorksSection";
import RequirementsSection from "@/components/mbconnect/RequirementsSection";
import BenefitsStrip from "@/components/mbconnect/BenefitsStrip";
import TestimonialsSection from "@/components/mbconnect/TestimonialsSection";
import CTABanner from "@/components/mbconnect/CTABanner";
import FAQSection from "@/components/mbconnect/FAQSection";
import { getOrganizationSchema } from "@/lib/schema/organization.schema";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "MBConnect by MusafirBaba - Driver & Vehicle Owner Partner App";
const DESCRIPTION =
  "Join MBConnect, the trusted driver-partner app by MusafirBaba. Get more rides, high earnings, timely payments, and 24x7 support. Drive your way.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords:
    "MBConnect, MusafirBaba driver app, driver partner app, become a driver partner, vehicle owner app, ride sharing partner India",
  alternates: {
    canonical: "https://musafirbaba.com/mbconnect",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbconnect",
    siteName: "MusafirBaba",
    type: "website",
    images: [
      {
        url: "https://musafirbaba.com/partner/mbconnectwebsitebanner.avif",
        width: 1200,
        height: 630,
        alt: "MBConnect - Driver Partner App by MusafirBaba",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["https://musafirbaba.com/partner/mbconnectwebsitebanner.avif"],
  },
};

const FAQ_SCHEMA_ITEMS = [
  {
    q: "How do I join MBConnect as a driver partner?",
    a: "Tap \"Join MBConnect Today\" or message us on WhatsApp — our team will guide you through sign-up, document submission, and verification.",
  },
  {
    q: "What documents do I need to register?",
    a: "A valid driving license, your vehicle's RC (in your name, or an NOC if it isn't), insurance and PUC certificate, and a smartphone with an internet connection.",
  },
  {
    q: "How often will I get paid?",
    a: "Payments are made directly to your bank account on a regular, transparent schedule.",
  },
  {
    q: "Can I drive part-time, or is it full-time only?",
    a: "MBConnect is flexible — go online whenever suits you and drive at your own pace.",
  },
  {
    q: "Who do I contact if I face an issue?",
    a: "Our partner support team is available 24x7 via WhatsApp or the Contact Us page.",
  },
];

export default function MBConnectPage() {
  const organizationSchema = getOrganizationSchema();
  const webPageSchema = getWebPageSchema(TITLE, "mbconnect");
  const breadcrumbSchema = getBreadcrumbSchema("mbconnect");
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_SCHEMA_ITEMS.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <>
      {/* MBConnectHero.tsx renders the page's single, real, visible <h1> —
          not duplicated here. */}
      <MBConnectHero />
      <WhyPartnerSection />
      <HowItWorksSection />
      <RequirementsSection />
      <BenefitsStrip />
      <TestimonialsSection />
      <FAQSection />
      <CTABanner />

      <Script
        id="mbconnect-organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="mbconnect-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbconnect-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="mbconnect-faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
