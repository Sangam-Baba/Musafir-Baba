import CareerClientPage from "./pageClient";
import { Metadata } from "next";
import { getWebPageBySlug } from "../[...slug]/page";

const getAllJobs = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/job`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await getWebPageBySlug("career");
  return {
    title: data?.metaTitle,
    description: data?.metaDescription,
    keywords: data?.keywords,
    alternates: {
      canonical: data?.canonicalUrl
        ? `https://musafirbaba.com${data.canonicalUrl}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/career`,
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

export default async function CareerPage() {
  const data = await getWebPageBySlug("career");
  const allJob = await getAllJobs();
  return <CareerClientPage career={data} jobs={allJob} />;
}
