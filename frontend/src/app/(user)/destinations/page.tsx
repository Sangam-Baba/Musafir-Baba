import { notFound } from "next/navigation";
import { Metadata } from "next";
import DestinationPageClient from "./pageClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import Script from "next/script";
import { apiTimeoutSignal } from "@/lib/apiTimeout";
export interface DestinationInterface {
  _id: string;
  name: string;
  country: string;
  state: string;
  coverImage: {
    url: string;
    alt: string;
  };
}
export function generateMetadata(): Metadata {
  return {
    title: "Top Travel Destinations Worldwide for Every Traveller",
    description:
      "Explore the best travel destinations across India and the world. Find curated places to visit, top attractions, ideal seasons, and trip ideas for every traveller. | Musafir Baba",
    keywords: "Destinations",
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/destinations`,
    },
    openGraph: {
      title:
        "Top Travel Destinations Worldwide for Every Kind of Traveller | Musafir Baba",
      description:
        "Explore the best travel destinations across India and the world. Find curated places to visit, top attractions, ideal seasons, and trip ideas for every traveller. | Musafir Baba",
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/destinations`,
      type: "website",
      images: "https://musafirbaba.com/homebanner.webp",
    },
  };
}

// A failed/stalled request is treated like a non-OK response (notFound,
// called outside the try so it isn't swallowed) instead of failing the build
const getAllDestinations = async () => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/destination?status=published`,
      {
        next: { revalidate: 60 },
        signal: apiTimeoutSignal(),
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data?.data;
    }
  } catch (error) {
    console.error("Failed to fetch destinations:", error);
  }
  return notFound();
};
async function page() {
  const destinations = (await getAllDestinations()) as DestinationInterface[];
  const breadcrumbSchema = getBreadcrumbSchema("destinations");
  const collectionSchema = getCollectionSchema(
    "destinations",
    "https://musafirbaba.com/destinations",
    destinations.map((destination: DestinationInterface) => ({
      url: `https://musafirbaba.com/destinations/${destination.state}`,
    }))
  );
  return (
    <>
      <DestinationPageClient destinations={destinations} />
      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        key="destinations-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </>
  );
}

export default page;
