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
interface QueryResponse {
  success: boolean;
  data: Package[];
  total: number;
  page: number;
  totalPages: number;
}

const getSinglePackages = async (
  state: string,
  slug: string
): Promise<QueryResponse> => {
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
  return res.json();
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string; state: string; country: string };
}): Promise<Metadata> {
  const page = await getSinglePackages(params.state, params.slug);
  return {
    title: page.data[0].metaTitle || page.data[0].title,
    description: page.data[0].metaDescription,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/${params.country}/${params.state}/${page.data[0].slug}`,
    },
    keywords: page.data[0].keywords,
    openGraph: {
      title: page.data[0].metaTitle || page.data[0].title,
      description: page.data[0].metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/${params.country}/${params.state}/${page.data[0].slug}`,
      type: "website",
    },
  };
}

function PackageDetails({
  params,
}: {
  params: { slug: string; state: string; country: string };
}) {
  const { slug, state, country } = params;
  return <SlugClients state={state} slug={slug} country={country} />;
}

export default PackageDetails;
