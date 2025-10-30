import CareerClientPage from "./pageClient";
import { Metadata } from "next";

const getWebPageBySlug = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/career`);
  if (!res.ok) throw new Error("Failed to fetch career");
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata(): Promise<Metadata> {
  const data = await getWebPageBySlug();
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
    },
  };
}

export default function CareerPage() {
  return <CareerClientPage />;
}
