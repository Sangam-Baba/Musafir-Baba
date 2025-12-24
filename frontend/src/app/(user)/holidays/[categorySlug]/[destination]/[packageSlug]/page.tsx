import React from "react";
import SlugClients from "./SlugClients";
import { Metadata } from "next";
import { getPackageByCategorySlug } from "@/app/(user)/holidays/[categorySlug]/page";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import { getProductSchema } from "@/lib/schema/product.schema";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import Script from "next/script";

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
export interface Package {
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
  return data?.data[0] ?? {};
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    destination: string;
    packageSlug: string;
  }>;
}): Promise<Metadata> {
  const { categorySlug, destination, packageSlug } = await params;
  const page = await getSinglePackages(destination, packageSlug);
  return {
    title: page?.metaTitle || page.title,
    description: page?.metaDescription,
    alternates: {
      canonical: `https://musafirbaba.com/holidays/${categorySlug}/${destination}/${page.slug}`,
    },
    keywords: page.keywords,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `https://musafirbaba.com/holidays/${categorySlug}/${destination}/${page.slug}`,
      type: "website",
    },
  };
}

async function PackageDetails({
  params,
}: {
  params: Promise<{
    categorySlug: string;
    destination: string;
    packageSlug: string;
  }>;
}) {
  const { categorySlug, destination, packageSlug } = await params;
  const relatedGroupPackages = await getPackageByCategorySlug(categorySlug);
  const page = await getSinglePackages(destination, packageSlug);
  const breadcrumbSchema = getBreadcrumbSchema(
    "holidays/" + categorySlug + "/" + destination + "/" + packageSlug
  );
  const collectionSchema = getCollectionSchema(
    "Travel Packages for " + relatedGroupPackages[0]?.destination?.name,
    "https://musafirbaba.com/holidays/" + categorySlug + "/" + destination,
    relatedGroupPackages.map((pkg: Package) => ({
      url: `https://musafirbaba.com/holidays/${categorySlug}/${destination}/${pkg.slug}`,
    }))
  );
  const productSchema = getProductSchema(
    page.title,
    page.description,
    page.batch[0].quad.toLocaleString(),
    `https://musafirbaba.com/holidays/${categorySlug}/${destination}/${page.slug}`
  );
  const faqSchema = getFAQSchema(page.faqs ?? []);

  return (
    <>
      <SlugClients
        slug={packageSlug}
        state={destination}
        relatedGroupPackages={relatedGroupPackages.filter(
          (p: Package) => p.slug !== packageSlug
        )}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      <Script
        id="product-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
    </>
  );
}

export default PackageDetails;
