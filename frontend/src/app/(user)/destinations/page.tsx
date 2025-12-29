import { notFound } from "next/navigation";
import { Metadata } from "next";
import DestinationPageClient from "./pageClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import Script from "next/script";
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
    title:
      "Top Travel Destinations Worldwide for Every Kind of Traveller | Musafir Baba",
    description:
      "Explore the best travel destinations across India and the world. Find curated places to visit, top attractions, ideal seasons, and trip ideas for every traveller. | Musafir Baba",
    keywords: "Destinations",
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/destinations`,
    },
  };
}

const getAllDestinations = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination`, {
    next: { revalidate: 60 },
  });
  if (!res.ok) return notFound();
  const data = await res.json();
  return data?.data;
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
