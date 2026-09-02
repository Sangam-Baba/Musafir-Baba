import type { Metadata } from "next";
import Script from "next/script";
import LegalDocument, { LegalBlock } from "@/components/mbconnect/LegalDocument";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "MBConnect Privacy Policy - MusafirBaba";
const DESCRIPTION =
  "Privacy Policy for MBConnect, the partner/driver-facing app used by MusafirBaba's approved transportation service partners.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://musafirbaba.com/mbconnect/privacy-policy",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbconnect/privacy-policy",
    siteName: "MusafirBaba",
    type: "website",
  },
};

const BLOCKS: LegalBlock[] = [
  { type: "h2", text: "1. Introduction" },
  {
    type: "p",
    text: 'MBConnect is the partner/driver-facing application used by approved transportation service partners associated with MusafirBaba / Musafirbaba Travels Pvt. Ltd. ("MusafirBaba", "we", "us", or "our"). MBConnect enables eligible partners to receive and manage assigned bookings, access trip information, communicate with MusafirBaba operations, manage trip status, view earnings/payout information and use operational tools.',
  },
  {
    type: "p",
    text: "This Privacy Policy explains how we collect, use, store, disclose and protect personal information relating to partners, drivers, vehicles and operational activity.",
  },

  { type: "h2", text: "2. Information We Collect" },
  { type: "h2", text: "A. Partner Account Information" },
  {
    type: "ul",
    items: [
      "Partner/business name",
      "Contact person name",
      "Mobile number",
      "Email address",
      "Profile photograph where applicable",
      "Login and account information",
      "Communication preferences",
    ],
  },
  { type: "h2", text: "B. Driver Information" },
  {
    type: "ul",
    items: [
      "Driver name",
      "Mobile number",
      "Profile photograph where applicable",
      "Driving licence information and verification status",
      "Other information required for lawful eligibility/verification",
    ],
  },
  { type: "h2", text: "C. Vehicle Information" },
  {
    type: "ul",
    items: [
      "Vehicle registration number",
      "Vehicle make/model/category",
      "Registration details",
      "Insurance information",
      "Permit/fitness/compliance information where applicable",
      "Vehicle photographs where required",
      "Other information reasonably required for service eligibility",
    ],
  },
  { type: "h2", text: "D. Financial & Payout Information" },
  {
    type: "ul",
    items: [
      "Bank/payment account details",
      "Payout information",
      "Trip earnings",
      "Adjustments",
      "Refund/recovery amounts where applicable",
      "Tax-related information where legally required",
    ],
  },
  { type: "h2", text: "E. Trip & Operational Information" },
  {
    type: "ul",
    items: [
      "Assigned booking details",
      "Pickup/drop locations",
      "Travel date/time",
      "Route information",
      "Trip status",
      "Trip completion information",
      "Additional kilometres/hours where applicable",
      "Toll & Taxes",
      "Parking Charges",
      "Customer feedback/ratings",
      "Operational notes",
    ],
  },
  { type: "h2", text: "F. Location Information" },
  {
    type: "ul",
    items: [
      "Vehicle/driver location while performing assigned trips",
      "Route and trip movement information",
      "Pickup/drop proximity information",
      "Location information used for operational support, safety and dispute resolution",
    ],
  },
  { type: "h2", text: "G. Device & Technical Information" },
  {
    type: "ul",
    items: [
      "Device type",
      "Operating system",
      "App version",
      "IP address",
      "Device identifiers where applicable",
      "Network information",
      "App logs",
      "Crash/error information",
      "Security-related technical information",
    ],
  },

  { type: "h2", text: "3. How We Use Partner Information" },
  {
    type: "ul",
    items: [
      "Create and manage the partner account.",
      "Verify partner, driver and vehicle eligibility.",
      "Review and approve partners for services.",
      "Assign and manage customer bookings.",
      "Provide pickup, route and trip information required to perform assigned services.",
      "Monitor trip status and operational performance.",
      "Facilitate communication between MusafirBaba operations and partners.",
      "Calculate, reconcile and process partner earnings and payouts.",
      "Manage cancellations, waiting charges, additional kilometres and other applicable trip adjustments.",
      "Investigate complaints, incidents, disputes, fraud or misuse.",
      "Maintain platform and account security.",
      "Improve operational processes and service quality.",
      "Meet accounting, tax, regulatory and legal obligations.",
      "Provide relevant service communications, alerts and operational notifications.",
    ],
  },

  { type: "h2", text: "4. How the MBGo–MusafirBaba–MBConnect System Works" },
  {
    type: "p",
    text: "Customer bookings are not sent directly from MBGo to individual MBConnect partners.",
  },
  { type: "p", text: "The operational flow is:" },
  {
    type: "p",
    text: "MBGo Customer → MBGo App → MusafirBaba Server → MusafirBaba Operations Team → Assigned MBConnect Partner → Trip",
  },
  {
    type: "p",
    text: "The MusafirBaba operational team determines the appropriate partner assignment. An MBConnect partner receives booking information only after the booking has been assigned to that partner, subject to applicable operational requirements.",
  },

  { type: "h2", text: "5. Customer Information Available to Partners" },
  {
    type: "p",
    text: "Once a booking is assigned, the partner may receive information reasonably necessary to perform the trip, which may include:",
  },
  {
    type: "ul",
    items: [
      "Customer name",
      "Contact information where required for trip coordination",
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
    text: "Partners must treat customer information as confidential and use it only for fulfilling the assigned service and related legitimate operational purposes.",
  },

  { type: "h2", text: "6. Prohibited Use of Customer Data" },
  { type: "p", text: "Partners must not use customer information obtained through MBConnect to:" },
  {
    type: "ul",
    items: [
      "Market unrelated services",
      "Create personal customer databases",
      "Contact customers for unrelated commercial purposes",
      "Share or sell customer information",
      "Solicit customers outside authorised MusafirBaba processes",
      "Harass, threaten or otherwise misuse customer information",
      "Use customer information for unlawful purposes",
    ],
  },

  { type: "h2", text: "7. Location & GPS" },
  {
    type: "p",
    text: "MBConnect may process location information while a partner/driver is logged in, available for service, travelling to pickup, performing an assigned trip or otherwise using location-dependent features. Location may support assignment, navigation, ETA, trip verification, safety, customer support, fraud prevention and dispute resolution.",
  },
  {
    type: "p",
    text: "Location permissions may be necessary for certain MBConnect features. Disabling location access may affect the ability to receive or perform trips.",
  },

  { type: "h2", text: "8. Communication & Call/Chat Data" },
  {
    type: "p",
    text: "MBConnect may facilitate calls, messages or other communication between MusafirBaba operations, partners and customers where required for service delivery. Where technically and legally permitted, relevant communication metadata or records may be retained for service quality, security, fraud prevention and dispute resolution.",
  },
  {
    type: "p",
    text: "Where masked calling or in-app communication is implemented, the actual personal contact details of the parties may be protected from direct disclosure.",
  },

  { type: "h2", text: "9. Payments, Earnings & Payouts" },
  {
    type: "p",
    text: "We process partner earnings and payouts using information necessary for settlement and accounting. Payment/banking information may be shared with authorised payment, banking, accounting or tax service providers where necessary.",
  },

  { type: "h2", text: "10. Third-Party Service Providers" },
  {
    type: "p",
    text: "We may use third parties for cloud hosting, maps/navigation, authentication/OTP, communication, payments, analytics, security, document verification, customer support and other technology or operational services.",
  },

  { type: "h2", text: "11. Data Security" },
  {
    type: "p",
    text: "We use reasonable technical and organisational safeguards designed to protect partner, driver, vehicle and customer information against unauthorized access, loss, misuse, alteration, disclosure and destruction. No digital system can guarantee absolute security.",
  },

  { type: "h2", text: "12. Data Retention" },
  {
    type: "p",
    text: "We may retain information for as long as reasonably necessary for account management, booking and operational records, payout/accounting requirements, tax/legal obligations, security, dispute resolution, fraud prevention and legitimate business purposes. Information may be deleted, anonymised or securely disposed of when no longer required, subject to applicable requirements.",
  },

  { type: "h2", text: "13. Partner Privacy Rights" },
  {
    type: "p",
    text: "Subject to applicable law, partners may have rights relating to their personal data, including rights to obtain information about processing, request correction, request deletion where applicable, withdraw consent where processing is based on consent, raise a grievance, and exercise other rights available under applicable data-protection law.",
  },
  {
    type: "p",
    text: "Privacy requests: privacy@musafirbaba.com | Grievance Contact: [Name/Designation] | Address: [Registered Office Address]",
  },

  { type: "h2", text: "14. Documents & Verification" },
  {
    type: "p",
    text: "Where verification documents are required, MBConnect may collect and process relevant documents for partner, driver, vehicle, safety, regulatory or operational verification. The specific document set may vary by partner type, vehicle type, service and applicable law.",
  },

  { type: "h2", text: "15. Changes to This Privacy Policy" },
  {
    type: "p",
    text: "We may update this Privacy Policy from time to time. Where significant changes are made, we may notify partners through MBConnect, email, notifications or other appropriate means.",
  },

  { type: "h2", text: "16. Contact Us" },
  {
    type: "p",
    text: "MusafirBaba / Musafirbaba Travels Pvt. Ltd. — Email: privacy@musafirbaba.com — Partner Support: partner-support@musafirbaba.com — Phone: +91 92896 02447 — Address: 1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043",
  },
];

export default function MBConnectPrivacyPolicyPage() {
  const webPageSchema = getWebPageSchema(TITLE, "mbconnect/privacy-policy");
  const breadcrumbSchema = getBreadcrumbSchema("mbconnect/privacy-policy");

  return (
    <>
      <LegalDocument
        title="MBConnect Privacy Policy"
        lastUpdated="[DD/MM/YYYY]"
        effectiveFrom="[DD/MM/YYYY]"
        blocks={BLOCKS}
      />
      <Script
        id="mbconnect-privacy-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbconnect-privacy-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
