import CareerClientPage from "./pageClient";
import { Metadata } from "next";
import { getWebPageBySlug } from "../[...slug]/page";

export async function generateMetadata(): Promise<Metadata> {
  const data = await getWebPageBySlug("career");
  return {
    title: data?.metaTitle,
    description: data?.metsDescription,
    keywords: data?.keywords,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/career`,
    },
    openGraph: {
      title: data?.title,
      description: data?.description,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/career`,
      type: "website",
      images:
        data?.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}

export default function CareerPage() {
  return <CareerClientPage />;
}
