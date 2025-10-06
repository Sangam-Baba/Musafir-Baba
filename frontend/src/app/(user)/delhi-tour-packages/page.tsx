import { Metadata } from "next";
import DelhiTourWebPage from "./pageClient";

const getWebPageBySlug = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/delhi-tour-packages`,
    { cache: "no-store" } // ensures fresh data, remove if you want caching
  );
  if (!res.ok) throw new Error("Failed to fetch webpage data");
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata(): Promise<Metadata> {
  try {
    const data = await getWebPageBySlug();

    return {
      title: data?.metaTitle || "Delhi Tour Packages - Musafirbaba",
      description:
        data?.metaDescription ||
        "Discover the best tour packages in Delhi with Musafirbaba.",
      alternates: {
        canonical: "https://musafirbaba.com/delhi-tour-packages",
      },
      openGraph: {
        title: data?.metaTitle,
        description: data?.metaDescription,
        images: data?.coverImage?.url
          ? [{ url: data.coverImage.url, alt: data?.title }]
          : [],
      },
    };
  } catch (err) {
    return {
      title: "Delhi Tour Packages - Musafirbaba",
      description: "Discover the best tour packages in Delhi with Musafirbaba.",
    };
  }
}

export default async function DelhiTourPackages() {
  const DelhiTourData = await getWebPageBySlug();
  return <DelhiTourWebPage DelhiTourData={DelhiTourData} />;
}
