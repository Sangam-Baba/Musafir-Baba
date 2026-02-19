import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import { notFound } from "next/navigation";
import React from "react";
import {
  getPackageByDestinationSlug,
  CustomizedPackageInterface,
} from "@/app/(user)/holidays/customised-tour-packages/[destination]/page";
import { getCategory } from "@/app/(user)/holidays/page";
import MixedPackagesClient from "../../holidays/PackagesClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import Script from "next/script";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import ReadMore from "@/components/common/ReadMore";

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city?: string;
  description: string;
  content?: string;
  coverImage: coverImage;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  slug: string;
}
interface Batch {
  _id: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  startDate: string;
  endDate: string;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
interface Category {
  _id: string;
  name: string;
  slug: string;
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
interface coverImage {
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
  mainCategory: Category;
  coverImage: coverImage;
  gallery: string[];
  batch: Batch[];
  duration: Duration;
  metaTitle?: string;
  metaDescription?: string;
  keywords: string[];
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: Itinerary[];
  faqs: Faqs[];
  isFeatured: boolean;
  status: "draft" | "published";
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  slug: string;
  __v: number;
}
async function getGroupPackageByDestinationSlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${slug}`,
    {
      next: { revalidate: 60 },
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}

const getDestinationBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destination/slug/${slug}`,
  );
  if (!res.ok) throw new Error("Failed to fetch destination");
  const data = await res.json();
  return data?.data;
};
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  return {
    title: `${destination?.metaTitle}`,
    description: destination?.metaDescription,
    keywords: destination?.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/destinations/${slug}`,
    },
    openGraph: {
      title: destination?.metaTitle,
      description: destination?.metaDescription,
      url: `https://musafirbaba.com/destinations/${slug}`,
      type: "website",
      images:
        destination?.coverImage?.url ||
        "https://musafirbaba.com/homebanner.webp",
    },
  };
}
async function DestinationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const destination = await getDestinationBySlug(slug);
  const packages = await getGroupPackageByDestinationSlug(slug);
  const customizedPkg = await getPackageByDestinationSlug(slug);
  const newCustomizedPkg = customizedPkg.map(
    (pkg: CustomizedPackageInterface) => ({
      ...pkg,
      price: pkg.plans[0].price,
      mainCategory: { slug: "customised-tour-packages" },
    }),
  );
  const newGroupPkg = packages.map((pkg: Package) => ({
    ...pkg,
    price: pkg.batch[0].quad,
  }));

  const categorydata = await getCategory();
  const categories = categorydata?.data ?? [];

  const totalCategory = [...categories];
  const totalPackages = [...newGroupPkg, ...newCustomizedPkg];
  // if (!totalPackages || totalPackages.length === 0) return notFound();
  const breadcrumbSchema = getBreadcrumbSchema("destinations/" + slug);
  const collectionSchema = getCollectionSchema(
    "Explore Packages in " + slug,
    `https://musafirbaba.com/destinations/${slug}`,
    packages.map((pkg: Package) => ({
      url: `https://musafirbaba.com/holidays/${pkg.mainCategory.slug}/${slug}/${pkg.slug}`,
    })),
  );
  return (
    <section>
      <Hero
        image={destination?.coverImage?.url || "/Hero1.jpg"}
        title={`Explore Packages in ${
          slug.charAt(0).toUpperCase() + slug.slice(1)
        }`}
        description={destination?.description}
        height="lg"
        align="center"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-5">
        <Breadcrumb />
      </div>
      {destination?.content && (
        <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
          <ReadMore content={destination?.content} />
        </div>
      )}
      {totalPackages.length === 0 ? (
        <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
          <p className="text-2xl font-semibold text-gray-800 text-center">
            No packages found for this destination
          </p>
        </div>
      ) : (
        <MixedPackagesClient data={totalPackages} category={totalCategory} />
      )}
      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        key="package-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </section>
  );
}

export default DestinationPage;
