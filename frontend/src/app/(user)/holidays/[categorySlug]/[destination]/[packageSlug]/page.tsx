import React from "react";
import SlugClients from "./SlugClients";
import { Metadata } from "next";

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city?: string;
  description: string;
  coverImage: string;
  slug: string;
}
interface Batch {
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  doubleDiscount: number;
  tripleDiscount: number;
  childDiscount: number;
}
export interface Duration {
  days: number;
  nights: number;
}
export interface Faqs {
  question: string;
  answer: string;
}
export interface Itinerary {
  title: string;
  description: string;
}

interface Image {
  url: string;
  public_id: string;
  alt: string;
  width?: number;
  height?: number;
}
interface Package {
  _id: string;
  title: string;
  description: string;
  destination: Destination;
  coverImage: Image;
  gallery: Image[];
  batch: Batch[];
  duration: Duration;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: Itinerary[];
  itineraryDownload?: Image;
  faqs: Faqs[];
  isFeatured: boolean;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  slug: string;
  __v: number;
}
// interface QueryResponse {
//   success: boolean;
//   data: Package[];
//   total: number;
//   page: number;
//   totalPages: number;
// }

const getSinglePackages = async (
  state: string,
  slug: string
): Promise<Package> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${state}&slug=${slug}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Package");
  }
  const data = await res.json();
  return data?.data ?? {};
};

export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string; destination: string; packageSlug: string };
}): Promise<Metadata> {
  const page = await getSinglePackages(params.destination, params.packageSlug);
  return {
    title: page?.metaTitle || page.title,
    description: page?.metaDescription,
    alternates: {
      canonical: `https://musafirbaba.com/holidays/${params.categorySlug}/${params.destination}/${page.slug}`,
    },
    keywords: page.keywords,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `https://musafirbaba.com/holidays/${params.categorySlug}/${params.destination}/${page.slug}`,
      type: "website",
    },
  };
}

async function PackageDetails({
  params,
}: {
  params: { categorySlug: string; destination: string; packageSlug: string };
}) {
  const { destination, packageSlug } = params;
  const packageData = await getSinglePackages(destination, packageSlug);
  return <SlugClients slug={packageSlug} state={destination} />;
}

export default PackageDetails;
