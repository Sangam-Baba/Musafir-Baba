import type { Metadata } from "next";
import Script from "next/script";
import LegalDocument, { LegalBlock } from "@/components/mbconnect/LegalDocument";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "MBConnect Terms & Conditions - MusafirBaba";
const DESCRIPTION =
  "Terms & Conditions governing access to and use of MBConnect by approved transportation partners, drivers and/or vehicle operators.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://musafirbaba.com/mbconnect/terms-and-conditions",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbconnect/terms-and-conditions",
    siteName: "MusafirBaba",
    type: "website",
  },
};

const BLOCKS: LegalBlock[] = [
  { type: "h2", text: "1. Purpose and Acceptance" },
  {
    type: "p",
    text: "These Terms & Conditions govern access to and use of MBConnect by approved transportation partners, drivers and/or vehicle operators. By registering for, accessing or using MBConnect, the partner acknowledges and agrees to these Terms, subject to any separate written partner agreement or commercial arrangement entered into with MusafirBaba.",
  },
  {
    type: "p",
    text: "Where a separate signed agreement applies, the documents should be read together. In case of conflict, the applicable signed agreement will prevail to the extent stated in that agreement.",
  },

  { type: "h2", text: "2. Partner Eligibility" },
  {
    type: "p",
    text: "A partner must meet MusafirBaba's applicable onboarding, operational, safety, vehicle and legal requirements. Approval may depend on partner type, vehicle category, service area, documentation, background/eligibility checks and operational requirements.",
  },

  { type: "h2", text: "3. Account Registration" },
  {
    type: "ul",
    items: [
      "Provide true, accurate and current information.",
      "Submit documents requested for verification.",
      "Keep account and contact information updated.",
      "Protect login credentials and OTPs.",
      "Do not transfer, rent, sell or share the MBConnect account without written approval.",
      "Immediately report suspected unauthorized access.",
    ],
  },

  { type: "h2", text: "4. Verification & Documents" },
  {
    type: "p",
    text: "MusafirBaba may request documents reasonably required to verify the partner, driver and vehicle. Depending on the applicable service, these may include vehicle registration, insurance, permits, fitness/compliance documents, driving licence and other legally or operationally required records.",
  },
  {
    type: "p",
    text: "Approval does not guarantee continued eligibility. Documents must remain valid throughout the period in which the partner performs services.",
  },

  { type: "h2", text: "5. Vehicle Standards" },
  {
    type: "p",
    text: "Partners must ensure that vehicles used for MBConnect bookings are safe, roadworthy, clean, properly maintained and legally permitted for the relevant service.",
  },
  {
    type: "ul",
    items: [
      "Valid registration",
      "Required insurance",
      "Applicable permit/fitness/compliance",
      "Functional safety equipment where required",
      "Clean and suitable interior/exterior",
      "Timely maintenance and repairs",
    ],
  },

  { type: "h2", text: "6. Driver Standards" },
  {
    type: "p",
    text: "Drivers performing MBConnect bookings must be legally eligible to drive the applicable vehicle and must hold a valid driving licence and other required authorisations.",
  },
  {
    type: "p",
    text: "Drivers must not operate a vehicle while impaired by alcohol, drugs or any substance that may affect safe driving.",
  },

  { type: "h2", text: "7. Booking Assignment Model" },
  {
    type: "p",
    text: "MBGo customer bookings are received by MusafirBaba and managed through the MusafirBaba server and operations team. They are not automatically broadcast or directly transferred from MBGo to MBConnect partners.",
  },
  { type: "p", text: "The assignment flow is:" },
  { type: "p", text: "MBGo → MusafirBaba Server → Operations Team → MBConnect Partner" },
  {
    type: "p",
    text: "MusafirBaba may select an appropriate partner based on availability, location, vehicle category, route, service requirements, partner capacity, performance, compliance status and other operational considerations.",
  },

  { type: "h2", text: "8. Receiving & Accepting Bookings" },
  {
    type: "p",
    text: "An assigned booking may be presented in MBConnect with the relevant trip details. The partner must follow the applicable acceptance, rejection, timeout and cancellation rules communicated through the platform or partner agreement.",
  },
  {
    type: "p",
    text: "Repeated unjustified refusal, acceptance followed by avoidable cancellation, or manipulation of booking status may result in review or account action.",
  },

  { type: "h2", text: "9. Trip Execution" },
  {
    type: "p",
    text: "The partner is responsible for performing an assigned booking professionally, safely and in accordance with the confirmed trip details.",
  },
  {
    type: "ul",
    items: [
      "Reach the pickup point within the agreed/required time.",
      "Maintain communication where reasonably necessary.",
      "Follow the confirmed itinerary unless changes are authorised.",
      "Treat customers respectfully.",
      "Operate the vehicle safely and lawfully.",
      "Update trip status accurately in MBConnect.",
      "Report breakdowns, accidents, delays or material issues promptly.",
    ],
  },

  { type: "h2", text: "10. Customer Information & Confidentiality" },
  {
    type: "p",
    text: "Customer information displayed in MBConnect is confidential. Partners may use it only to fulfil the assigned booking and related operational purposes.",
  },
  {
    type: "p",
    text: "Partners must not retain, copy, photograph, export, sell, publish or share customer information except where necessary and authorised for the service or required by law.",
  },

  { type: "h2", text: "11. No Unauthorised Customer Solicitation" },
  {
    type: "p",
    text: "Partners must not use customer details obtained through MBConnect to divert customers away from MusafirBaba, solicit unrelated bookings, create private customer lists, or otherwise bypass authorised MusafirBaba booking and settlement processes.",
  },

  { type: "h2", text: "12. Communication" },
  {
    type: "p",
    text: "Partners may communicate with customers through authorised MBGo/MBConnect channels or other methods specifically permitted by MusafirBaba. MusafirBaba may introduce masked calling, in-app chat or other privacy-protective communication mechanisms.",
  },

  { type: "h2", text: "13. Fare & Additional Charges" },
  {
    type: "p",
    text: "Partners must not collect unauthorised charges from customers. Applicable charges may include additional kilometres/hours, waiting charges, Toll & Taxes, Parking Charges, route deviations or other approved trip charges.",
  },
  {
    type: "p",
    text: "Where an additional charge requires operational approval, the partner must follow the process specified by MusafirBaba before collecting or recording it.",
  },

  { type: "h2", text: "14. Partner Earnings" },
  {
    type: "p",
    text: "Partner earnings are determined according to the applicable commercial arrangement, booking terms and approved adjustments. Earnings may be affected by cancellations, refunds, penalties, recoveries, taxes, disputes, approved additional charges and other applicable adjustments.",
  },
  {
    type: "p",
    text: "A partner may view eligible earnings and payout information through MBConnect or other authorised systems.",
  },

  { type: "h2", text: "15. Payouts" },
  {
    type: "p",
    text: "Payouts will be made to the registered payout account according to the applicable payout cycle and commercial arrangement. Partners are responsible for providing accurate bank/payment information.",
  },
  {
    type: "p",
    text: "MusafirBaba may withhold, adjust or recover amounts where permitted by the applicable agreement, including in relation to refunds, duplicate payments, fraudulent transactions, unresolved disputes or other legitimate adjustments.",
  },

  { type: "h2", text: "16. Cancellations & No-Show" },
  {
    type: "p",
    text: "Partners must follow the cancellation and no-show process communicated by MusafirBaba. Partners must not falsely mark customers as no-show or cancel trips to manipulate earnings, allocation or performance metrics.",
  },

  { type: "h2", text: "17. Trip Status & GPS Integrity" },
  {
    type: "p",
    text: "Partners must accurately use MBConnect trip-status functions. Any attempt to manipulate GPS/location data, trip start/end times, route information, kilometres, booking status or other operational records may result in investigation and account action.",
  },

  { type: "h2", text: "18. Customer Conduct & Safety Incidents" },
  {
    type: "p",
    text: "Partners should report serious customer misconduct, safety concerns, accidents, vehicle damage, threats or other incidents promptly through the designated support channel. Partners should not take unlawful retaliatory action or misuse customer information.",
  },

  { type: "h2", text: "19. Ratings, Complaints & Reviews" },
  {
    type: "p",
    text: "Customers may rate or review services. MusafirBaba may use ratings and complaints for service-quality and operational purposes. Partners may raise a review/dispute through the applicable support process.",
  },

  { type: "h2", text: "20. Prohibited Conduct" },
  {
    type: "ul",
    items: [
      "Fraudulent bookings or trips",
      "Fake trip completion",
      "GPS or status manipulation",
      "Unauthorized fare collection",
      "Customer solicitation outside authorised channels",
      "Misuse or disclosure of customer data",
      "Document or identity fraud",
      "Unsafe or unlawful driving",
      "Harassment, threats or discrimination",
      "Use of an unapproved vehicle or driver",
      "Sharing MBConnect credentials",
      "Attempting to bypass MusafirBaba booking or settlement processes",
    ],
  },

  { type: "h2", text: "21. Suspension & Deactivation" },
  {
    type: "p",
    text: "MusafirBaba may temporarily restrict, suspend or deactivate an account where there is suspected fraud, serious safety risk, document non-compliance, customer-data misuse, repeated service failures, unauthorised conduct, non-payment/recovery issues or other material violation of these Terms.",
  },
  {
    type: "p",
    text: "Where appropriate, partners may be provided an opportunity to respond or appeal in accordance with the applicable process, except where immediate action is reasonably necessary for safety, security, fraud prevention or legal compliance.",
  },

  { type: "h2", text: "22. Partner Support & Disputes" },
  {
    type: "p",
    text: "Partners may contact MusafirBaba partner support regarding booking allocation, earnings, cancellations, customer complaints, technical issues, documents or other operational matters.",
  },
  {
    type: "p",
    text: "Partner Support: partner-support@musafirbaba.com | [Partner Support Number]",
  },

  { type: "h2", text: "23. Independent Business / Relationship" },
  {
    type: "p",
    text: "The exact legal relationship between MusafirBaba and an MBConnect partner—including whether the partner is an independent contractor, service provider, fleet operator, employee or another category—must be determined and stated consistently with the applicable written agreement and actual operating model. Nothing in this draft should be treated as a final legal classification without legal review.",
  },

  { type: "h2", text: "24. Taxes & Legal Compliance" },
  {
    type: "p",
    text: "Partners are responsible for complying with applicable laws, licences, permits, taxes and other regulatory requirements applicable to their business, vehicle and driving activities. MusafirBaba may apply tax deductions, reporting or documentation requirements where legally required.",
  },

  { type: "h2", text: "25. Intellectual Property" },
  {
    type: "p",
    text: "MBConnect software, branding, logos, designs, content and related materials are owned by or licensed to MusafirBaba or the relevant rights holders. Partners may use MBConnect only for authorised business purposes and may not copy, reverse engineer, modify, distribute or commercially exploit it without permission.",
  },

  { type: "h2", text: "26. Technology Availability" },
  {
    type: "p",
    text: "MBConnect may be affected by network availability, device limitations, GPS accuracy, maintenance, technical failures and third-party services. MusafirBaba may modify, suspend or update features as reasonably necessary.",
  },

  { type: "h2", text: "27. Confidentiality" },
  {
    type: "p",
    text: "Partners must keep confidential information received through MBConnect or MusafirBaba confidential and must not disclose it except where authorised or legally required.",
  },

  { type: "h2", text: "28. Limitation of Liability" },
  {
    type: "p",
    text: "To the extent permitted by applicable law and the applicable partner agreement, MusafirBaba will not be liable for losses caused by circumstances beyond its reasonable control. Nothing in these Terms excludes liability that cannot legally be excluded.",
  },

  { type: "h2", text: "29. Indemnity" },
  {
    type: "p",
    text: "To the extent permitted by law and applicable agreement, the partner may be responsible for claims, losses, penalties, costs or expenses arising from the partner's unlawful conduct, fraud, misuse of customer information, breach of these Terms, negligent performance, vehicle/driver non-compliance or violation of third-party rights.",
  },

  { type: "h2", text: "30. Governing Law & Jurisdiction" },
  {
    type: "p",
    text: "These Terms shall be governed by the laws of India. Disputes shall be subject to the jurisdiction of courts having appropriate jurisdiction over [Delhi/New Delhi – confirm final jurisdiction], subject to applicable law and any separate written partner agreement.",
  },

  { type: "h2", text: "31. Changes to Terms" },
  {
    type: "p",
    text: "MusafirBaba may update these Terms from time to time. Material changes may be communicated through MBConnect, email or other appropriate means. Continued use of MBConnect after the effective date may constitute acceptance to the extent permitted by law.",
  },

  { type: "h2", text: "32. Contact" },
  {
    type: "p",
    text: "MusafirBaba / Musafirbaba Travels Pvt. Ltd. — Partner Support: partner-support@musafirbaba.com — Privacy: privacy@musafirbaba.com — Phone: +91 92896 02447 — Address: 1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043",
  },
];

export default function MBConnectTermsAndConditionsPage() {
  const webPageSchema = getWebPageSchema(TITLE, "mbconnect/terms-and-conditions");
  const breadcrumbSchema = getBreadcrumbSchema("mbconnect/terms-and-conditions");

  return (
    <>
      <LegalDocument
        title="MBConnect Terms & Conditions"
        lastUpdated="[DD/MM/YYYY]"
        effectiveFrom="[DD/MM/YYYY]"
        blocks={BLOCKS}
      />
      <Script
        id="mbconnect-terms-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbconnect-terms-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
