import type { Metadata } from "next";
import Script from "next/script";
import LegalDocument, { LegalBlock } from "@/components/mbconnect/LegalDocument";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "MBGo Privacy Policy - MusafirBaba";
const DESCRIPTION =
  "Privacy Policy for MBGo, the mobility and travel booking platform operated by MusafirBaba Travel.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://musafirbaba.com/mbgo/privacy-policies",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbgo/privacy-policies",
    siteName: "MusafirBaba",
    type: "website",
  },
};

const BLOCKS: LegalBlock[] = [
  { type: "h2", text: "1. Introduction" },
  {
    type: "p",
    text: 'Welcome to MBGo, a mobility and travel booking platform operated by MusafirBaba Travel ("MusafirBaba", "we", "us", or "our"). MBGo enables customers to request transportation services, obtain quotations, make bookings and payments, manage trips, receive updates, and contact customer support.',
  },
  {
    type: "p",
    text: "This Privacy Policy explains how we collect, use, store, disclose and protect personal information when you use MBGo, our website, related services or other digital interfaces.",
  },

  { type: "h2", text: "2. Information We Collect" },
  { type: "h2", text: "A. Account Information" },
  {
    type: "ul",
    items: [
      "Name",
      "Mobile number",
      "Email address",
      "Account/login information",
      "Profile information",
      "Communication preferences",
    ],
  },
  { type: "h2", text: "B. Booking Information" },
  {
    type: "ul",
    items: [
      "Pickup and drop locations",
      "Travel date and time",
      "Number of passengers",
      "Vehicle/category selected",
      "Trip type",
      "Special requirements",
      "Booking ID",
      "Fare/quotation information",
      "Payment status",
    ],
  },
  { type: "h2", text: "C. Location Information" },
  {
    type: "ul",
    items: [
      "Pickup location",
      "Drop location",
      "Live or approximate trip location where applicable",
      "Route information",
      "Location information associated with a trip",
    ],
  },
  { type: "h2", text: "D. Payment Information" },
  {
    type: "ul",
    items: [
      "Payment status",
      "Transaction ID",
      "Payment method/type",
      "Amount paid",
      "Refund status",
    ],
  },
  {
    type: "p",
    text: "Payments may be processed through third-party payment providers. We generally do not need to store complete card details, CVV, UPI PIN or banking credentials.",
  },
  { type: "h2", text: "E. Device & Technical Information" },
  {
    type: "ul",
    items: [
      "Device type",
      "Operating system",
      "App version",
      "IP address",
      "Device identifiers where applicable",
      "Crash/error information",
      "Network information",
      "Log information",
    ],
  },

  { type: "h2", text: "3. How We Use Your Information" },
  {
    type: "ul",
    items: [
      "Create and manage your MBGo account.",
      "Prepare quotations and fare estimates.",
      "Process and confirm bookings.",
      "Coordinate transportation services.",
      "Process assigned bookings through our internal operations system.",
      "Share necessary trip information with the assigned MBConnect service partner.",
      "Process payments, refunds and cancellations.",
      "Send booking confirmations and trip updates.",
      "Provide customer support and resolve disputes.",
      "Detect fraud, misuse or unauthorized activity.",
      "Maintain platform and account security.",
      "Improve MBGo functionality and user experience.",
      "Comply with applicable laws and lawful government requirements.",
      "Send promotional communications where permitted and in accordance with applicable consent/preferences.",
    ],
  },

  { type: "h2", text: "4. How MBGo Booking Data Flows" },
  { type: "p", text: "MBGo follows a managed booking model:" },
  {
    type: "p",
    text: "Customer → MBGo App → MusafirBaba Server → MusafirBaba Operations Team → Eligible MBConnect Partner → Trip",
  },
  {
    type: "p",
    text: "Bookings are not directly assigned by MBGo to MBConnect partners. The MusafirBaba operational team reviews/manages bookings and assigns them to an appropriate MBConnect partner. Necessary booking information may be shared with the assigned partner only to the extent reasonably required to fulfil the service.",
  },

  { type: "h2", text: "5. Information Shared With Service Partners" },
  {
    type: "ul",
    items: [
      "Customer name",
      "Contact information where required",
      "Pickup and drop details",
      "Travel date/time",
      "Passenger count",
      "Vehicle/service requirements",
      "Booking reference",
      "Relevant trip instructions",
    ],
  },
  {
    type: "p",
    text: "MBConnect partners are expected to use customer information only for fulfilling the assigned booking and related legitimate service purposes.",
  },

  { type: "h2", text: "6. Third-Party Service Providers" },
  {
    type: "p",
    text: "We may use trusted providers for payment processing, maps/navigation, SMS/OTP delivery, email, cloud hosting, analytics, customer support, security, fraud prevention and technical infrastructure. Such providers may process information on our behalf or independently where applicable.",
  },

  { type: "h2", text: "7. Location Data" },
  {
    type: "p",
    text: "MBGo may request location permission depending on the services used. Location may support pickup coordination, navigation, trip tracking, partner coordination, safety, customer support and route-related services. Disabling location permissions may affect certain features.",
  },

  { type: "h2", text: "8. Communications" },
  {
    type: "p",
    text: "We may contact you through SMS, phone calls, WhatsApp where applicable, email, push notifications and in-app notifications for OTP/login, booking, payment, cancellation, pickup, trip status, partner information, support, safety and important service changes. Marketing communications will be managed according to your preferences and applicable law.",
  },

  { type: "h2", text: "9. Payments" },
  {
    type: "p",
    text: "External payment gateways may process payments. MBGo may retain transaction-related information required for booking records, accounting, refunds, reconciliation, customer support, fraud prevention and legal compliance.",
  },

  { type: "h2", text: "10. Data Security" },
  {
    type: "p",
    text: "We take reasonable technical and organisational measures designed to protect personal information against unauthorized access, loss, misuse, alteration, disclosure and destruction. No digital system can guarantee absolute security.",
  },

  { type: "h2", text: "11. Data Retention" },
  {
    type: "p",
    text: "We retain personal information only for as long as reasonably necessary for providing services, maintaining booking records, accounting and financial requirements, customer support, dispute resolution, fraud prevention, security and legal/regulatory obligations. When information is no longer required, we may delete, anonymise or securely dispose of it, subject to applicable requirements.",
  },

  { type: "h2", text: "12. Your Privacy Rights" },
  {
    type: "p",
    text: "Subject to applicable law, you may have rights relating to your personal data, including rights to obtain information about processing, request correction, request deletion where applicable, withdraw consent where processing is based on consent, raise a grievance, and exercise other rights available under applicable data-protection law.",
  },
  {
    type: "p",
    text: "Privacy requests: privacy@musafirbaba.com | Grievance Contact: [Name/Designation] | Address: [Registered Office Address]",
  },

  { type: "h2", text: "13. Children's Privacy" },
  {
    type: "p",
    text: "MBGo is intended for users who are legally permitted to use the service. We do not knowingly process children's personal data in violation of applicable law. Where applicable law requires parental/guardian consent, we will follow the required process.",
  },

  { type: "h2", text: "14. Cookies & Similar Technologies" },
  {
    type: "p",
    text: "Our website and digital services may use cookies, SDKs or similar technologies for session management, security, analytics, performance, personalisation and service improvement. You may manage certain permissions through your browser or device settings.",
  },

  { type: "h2", text: "15. Changes to This Privacy Policy" },
  {
    type: "p",
    text: "We may update this Privacy Policy from time to time. Where significant changes are made, we may notify users through MBGo, email, notifications or other appropriate means. The latest version will be made available through MBGo and/or the MusafirBaba website.",
  },

  { type: "h2", text: "16. Contact Us" },
  {
    type: "p",
    text: "MusafirBaba / Musafirbaba Travels Pvt. Ltd. — Email: privacy@musafirbaba.com — Phone: +91 92896 02447 — Address: 1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043",
  },
];

export default function MBGoPrivacyPolicyPage() {
  const webPageSchema = getWebPageSchema(TITLE, "mbgo/privacy-policies");
  const breadcrumbSchema = getBreadcrumbSchema("mbgo/privacy-policies");

  return (
    <>
      <div className="pt-16 md:pt-0">
        <LegalDocument
          title="MBGo Privacy Policy"
          lastUpdated="[DD/MM/YYYY]"
          effectiveFrom="[DD/MM/YYYY]"
          blocks={BLOCKS}
        />
      </div>
      <Script
        id="mbgo-privacy-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbgo-privacy-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
