import { Metadata } from "next";
import VisaClientPage from "./visaClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import Script from "next/script";

export const metadata: Metadata = {
  title: "Tourist Visa Services for 180+ Countries | MusafirBaba",
  description:
    "Get Tourist Visa Services for 180+ countries with MusafirBaba – Japan, Singapore, Schengen, Hong Kong & more. Fast processing, trusted assistance!",
  alternates: {
    canonical: "https://musafirbaba.com/visa",
  },
};
export const getVisa = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`, {
    next: {
      revalidate: 60,
    },
  });
  if (!res.ok) {
    // A transient backend blip during build used to throw here and crash
    // the entire static export (all pages), not just this one. Degrade to
    // an empty list instead — matches the array shape callers already
    // expect (see the `// []` below).
    console.error("Failed to fetch visas:", res.status);
    return [];
  }
  const data = await res.json();
  return data?.data; // []
};

export default async function VisaMainPage() {
  const visa = await getVisa();
  const breadcrumb = getBreadcrumbSchema("visa");
  const collection = getCollectionSchema(
    "Visa",
    "https://musafirbaba.com/visa",
    visa.map((visa: { slug: string }) => ({
      url: `https://musafirbaba.com/visa/${visa.slug}`,
    }))
  );

  return (
    <>
      <VisaClientPage visa={visa} />
      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <Script
        key="visa-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collection) }}
      />
    </>
  );
}
