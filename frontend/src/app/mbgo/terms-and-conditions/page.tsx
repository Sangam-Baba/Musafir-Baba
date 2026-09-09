import type { Metadata } from "next";
import Script from "next/script";
import LegalDocument, { LegalBlock } from "@/components/mbconnect/LegalDocument";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "MBGo Terms & Conditions - MusafirBaba";
const DESCRIPTION =
  "Terms & Conditions governing access to and use of MBGo, the mobility and travel service platform operated by MusafirBaba.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://musafirbaba.com/mbgo/terms-and-conditions",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbgo/terms-and-conditions",
    siteName: "MusafirBaba",
    type: "website",
  },
};

const BLOCKS: LegalBlock[] = [
  { type: "h2", text: "1. About MBGo" },
  {
    type: "p",
    text: "MBGo is a mobility and travel service platform operated by MusafirBaba / Musafirbaba Travels Pvt. Ltd. MBGo enables users to request, book and manage transportation and related travel services. By creating an account or using MBGo, you agree to these Terms & Conditions.",
  },

  { type: "h2", text: "2. User Account" },
  {
    type: "ul",
    items: [
      "Provide accurate information.",
      "Maintain the security of your account.",
      "Keep your phone number and email updated.",
      "Do not allow unauthorized persons to use your account.",
      "Provide accurate booking information.",
    ],
  },
  {
    type: "p",
    text: "We may restrict or suspend accounts involved in fraud, misuse, abuse or violation of these Terms.",
  },

  { type: "h2", text: "3. Quotations" },
  {
    type: "p",
    text: "MBGo may provide a quotation based on the information entered by the customer. A quotation may consider distance, duration, vehicle category, trip type, number of days, Toll & Taxes, Parking Charges, applicable local/state charges, additional services, waiting time and other applicable charges. A quotation is not necessarily a confirmed booking until the required booking process and payment have been completed.",
  },

  { type: "h2", text: "4. Booking Process" },
  {
    type: "p",
    text: "The typical process is: Quotation → Customer Confirmation → Payment → Booking Confirmation → MusafirBaba Operations → Partner Assignment → Trip.",
  },
  {
    type: "p",
    text: "A booking is not automatically assigned to an MBConnect partner at the time of quotation or payment. MusafirBaba's operations team will assign the booking to an appropriate MBConnect partner based on availability, service requirements, location and operational considerations.",
  },

  { type: "h2", text: "5. Payment" },
  {
    type: "p",
    text: "Customers may be required to make full payment, an advance/partial payment, or another applicable payment amount depending on the booking. A booking may remain unconfirmed until the required payment is successfully received.",
  },

  { type: "h2", text: "6. Booking Confirmation" },
  {
    type: "p",
    text: "After successful payment and internal processing, MBGo/MusafirBaba may issue a booking confirmation containing Booking ID, travel date, pickup details, destination, vehicle/service category, passenger information, amount paid, balance amount where applicable, and trip instructions.",
  },

  { type: "h2", text: "7. Partner Assignment" },
  {
    type: "p",
    text: "MusafirBaba reserves the right to select and assign an appropriate MBConnect partner. Assignment may depend on availability, vehicle category, location, route, partner capacity, service requirements, operational considerations and customer requirements. The customer does not acquire a right to select a particular MBConnect partner unless specifically offered and confirmed by MusafirBaba.",
  },

  { type: "h2", text: "8. Vehicle & Service" },
  {
    type: "p",
    text: "The vehicle provided will generally correspond to the category confirmed during booking. In exceptional operational circumstances, MusafirBaba may provide an equivalent or upgraded vehicle, subject to availability. Vehicle images shown in MBGo are illustrative unless specifically stated otherwise.",
  },

  { type: "h2", text: "9. Pickup & Trip" },
  {
    type: "p",
    text: "Customers are responsible for being available at the confirmed pickup location and time, providing accurate pickup information, following reasonable safety instructions, avoiding damage to the vehicle and complying with applicable laws.",
  },

  { type: "h2", text: "10. Additional Charges" },
  {
    type: "ul",
    items: [
      "Extra kilometres",
      "Additional hours",
      "Waiting charges",
      "Night charges",
      "Route deviations",
      "Additional stops",
      "Toll & Taxes",
      "Parking Charges",
      "State/local authority charges",
      "Permit-related charges",
      "Entry charges",
      "Other government or service charges",
    ],
  },
  {
    type: "p",
    text: "Applicable charges should be communicated to the customer where reasonably possible.",
  },

  { type: "h2", text: "11. Cancellation" },
  {
    type: "p",
    text: "Cancellation charges may depend on the booking type, time remaining before departure, payment made, service-provider conditions and booking-specific cancellation policy. The applicable cancellation policy will be displayed or communicated during booking wherever reasonably possible.",
  },

  { type: "h2", text: "12. Refunds" },
  {
    type: "p",
    text: "Where a refund is approved, it may be processed through the original payment method or another permitted method. Processing time may depend on internal processing, payment gateway, bank, card issuer or UPI provider. Applicable cancellation or administrative charges may be deducted before refund.",
  },

  { type: "h2", text: "13. Changes to Booking" },
  {
    type: "p",
    text: "Customers may request changes to pickup time/location, destination, vehicle category, passenger details, trip duration or other booking details. Changes are subject to availability and may result in additional charges.",
  },

  { type: "h2", text: "14. Customer Responsibilities" },
  {
    type: "ul",
    items: [
      "Do not use MBGo for unlawful activities.",
      "Do not provide false booking information.",
      "Do not attempt payment fraud.",
      "Do not misuse promotional offers.",
      "Do not damage vehicles.",
      "Do not harass drivers/partners.",
      "Do not carry prohibited or unlawful items.",
      "Do not use the service for activities prohibited by law.",
    ],
  },

  { type: "h2", text: "15. Safety" },
  {
    type: "p",
    text: "Customers must comply with applicable safety requirements. MBGo may take reasonable measures where it identifies safety concerns, fraud, abuse, threatening behaviour or unauthorized activity.",
  },

  { type: "h2", text: "16. Service Availability" },
  {
    type: "p",
    text: "We aim to provide reliable services but cannot guarantee uninterrupted availability. Services may be affected by weather, traffic, road closures, government restrictions, vehicle breakdown, natural disasters, technical failures, strikes, force majeure events or other circumstances beyond reasonable control.",
  },

  { type: "h2", text: "17. Delays" },
  {
    type: "p",
    text: "Travel times displayed or estimated in MBGo are estimates and may be affected by traffic, weather, road conditions, route restrictions, accidents, local regulations and unforeseen circumstances. MBGo does not guarantee a specific arrival time unless expressly confirmed as a guaranteed service.",
  },

  { type: "h2", text: "18. Lost & Found" },
  {
    type: "p",
    text: "Customers should promptly report lost belongings. MusafirBaba may assist in coordinating with the assigned MBConnect partner, but recovery is subject to availability and circumstances. Customers should check belongings before leaving the vehicle.",
  },

  { type: "h2", text: "19. Third-Party Services" },
  {
    type: "p",
    text: "Certain services may be provided by independent MBConnect partners or other third-party service providers. MusafirBaba coordinates the booking and operational process but does not control every aspect of an independently operated service.",
  },

  { type: "h2", text: "20. Technology & App Usage" },
  {
    type: "p",
    text: "MBGo may contain maps, GPS/location functionality, payment services, notifications and third-party integrations. Availability may depend on your device, network and third-party services.",
  },

  { type: "h2", text: "21. Intellectual Property" },
  {
    type: "p",
    text: "The MBGo application, branding, logos, software, designs, content and related materials are owned by or licensed to MusafirBaba or their respective rights holders. Users may not copy, modify, reverse engineer, reproduce, sell, distribute or exploit MBGo intellectual property without prior written permission.",
  },

  { type: "h2", text: "22. Promotions & Offers" },
  {
    type: "p",
    text: "Promotional offers may have separate terms, eligibility requirements and validity periods. MusafirBaba may modify or withdraw offers, limit usage, or cancel fraudulent or abusive transactions.",
  },

  { type: "h2", text: "23. Suspension or Termination" },
  {
    type: "p",
    text: "We may suspend or terminate access to MBGo if a user violates these Terms, engages in fraud, misuses the platform, creates safety concerns, provides false information or uses the platform unlawfully.",
  },

  { type: "h2", text: "24. Limitation of Liability" },
  {
    type: "p",
    text: "To the extent permitted by applicable law, MusafirBaba will not be responsible for losses arising from circumstances beyond its reasonable control. Nothing in these Terms is intended to exclude liability that cannot legally be excluded.",
  },

  { type: "h2", text: "25. Indemnity" },
  {
    type: "p",
    text: "To the extent permitted by law, users may be responsible for losses, claims or expenses arising from violation of these Terms, misuse of MBGo, fraudulent activity, unlawful conduct, damage caused to vehicles/property or violation of another person's rights.",
  },

  { type: "h2", text: "26. Governing Law" },
  {
    type: "p",
    text: "These Terms shall be governed by the laws of India. Any disputes shall be subject to the jurisdiction of the courts having appropriate jurisdiction over [Delhi/New Delhi – confirm registered office jurisdiction], subject to applicable law.",
  },

  { type: "h2", text: "27. Changes to Terms" },
  {
    type: "p",
    text: "MusafirBaba may update these Terms from time to time. Continued use of MBGo after revised Terms become effective may constitute acceptance of the revised Terms to the extent permitted by law.",
  },

  { type: "h2", text: "28. Customer Support" },
  {
    type: "p",
    text: "MBGo Customer Support — Phone: +91 9286 0247 — Email: support@musafirbaba.com — Website: www.musafirbaba.com — Privacy: privacy@musafirbaba.com",
  },
];

export default function MBGoTermsAndConditionsPage() {
  const webPageSchema = getWebPageSchema(TITLE, "mbgo/terms-and-conditions");
  const breadcrumbSchema = getBreadcrumbSchema("mbgo/terms-and-conditions");

  return (
    <>
      <div className="pt-16 md:pt-0">
        <LegalDocument
          title="MBGo Terms & Conditions"
          lastUpdated="[DD/MM/YYYY]"
          effectiveFrom="[DD/MM/YYYY]"
          blocks={BLOCKS}
        />
      </div>
      <Script
        id="mbgo-terms-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbgo-terms-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
