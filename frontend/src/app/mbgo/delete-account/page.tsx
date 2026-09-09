import type { Metadata } from "next";
import Script from "next/script";
import LegalDocument, { LegalBlock } from "@/components/mbconnect/LegalDocument";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

const TITLE = "Delete Your MBGo Account - MusafirBaba";
const DESCRIPTION =
  "How to request deletion of your MBGo account and associated data.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "https://musafirbaba.com/mbgo/delete-account",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://musafirbaba.com/mbgo/delete-account",
    siteName: "MusafirBaba",
    type: "website",
  },
};

const BLOCKS: LegalBlock[] = [
  { type: "h2", text: "Requesting Account Deletion" },
  {
    type: "p",
    text: 'MBGo is the ride-booking app operated by MusafirBaba / Musafirbaba Travels Pvt. Ltd. ("MusafirBaba"). If you would like to delete your MBGo account and associated data, follow the steps below.',
  },
  { type: "h2", text: "How to Request Deletion" },
  {
    type: "ul",
    items: [
      "Send an email to privacy@musafirbaba.com from the email address (or with the mobile number) registered on your MBGo account.",
      "Use the subject line \"MBGo Account Deletion Request\".",
      "Our team will verify your identity and confirm the request within a reasonable timeframe.",
    ],
  },
  { type: "h2", text: "What Gets Deleted" },
  {
    type: "p",
    text: "Once your request is verified, we will delete your personal account information, including your name, contact details, saved addresses, uploaded identity documents, and app usage data associated with your account.",
  },
  { type: "h2", text: "What May Be Retained" },
  {
    type: "p",
    text: "Certain records may be retained even after account deletion where required for legal, tax, accounting, fraud-prevention, dispute-resolution or regulatory compliance purposes -- for example, completed booking and payment records, invoices, and communications relevant to an ongoing dispute or investigation. Retained records are kept only for as long as reasonably necessary for these purposes and are handled in accordance with our Privacy Policy.",
  },
  { type: "h2", text: "Related" },
  {
    type: "p",
    text: "For more information on how we handle your data, see our Privacy Policy at musafirbaba.com/mbgo/privacy-policies.",
  },
];

export default function MBGoDeleteAccountPage() {
  const webPageSchema = getWebPageSchema(TITLE, "mbgo/delete-account");
  const breadcrumbSchema = getBreadcrumbSchema("mbgo/delete-account");

  return (
    <>
      <div className="pt-16 md:pt-0">
        <LegalDocument
          title="Delete Your MBGo Account"
          lastUpdated="[DD/MM/YYYY]"
          effectiveFrom="[DD/MM/YYYY]"
          blocks={BLOCKS}
        />
      </div>
      <Script
        id="mbgo-delete-account-webpage-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageSchema) }}
      />
      <Script
        id="mbgo-delete-account-breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}
