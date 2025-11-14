import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import PackageCard from "@/components/custom/PackageCard";
import { notFound } from "next/navigation";
import React from "react";

interface Destination {
  _id: string;
  name: string;
  country: string;
  state: string;
  city?: string;
  description: string;
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
async function getPackageByDestinationSlug(categorySlug: string, slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${slug}&category=${categorySlug}`,
    {
      cache: "no-cache",
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}

export async function generateMetadata({
  params,
}: {
  params: { categorySlug: string; destination: string };
}) {
  const { categorySlug, destination } = params;
  const pkgData = await getPackageByDestinationSlug(categorySlug, destination);
  return {
    title: `${
      pkgData[0]?.destination?.metaTitle || pkgData[0]?.destination?.name
    } | Musafir Baba`,
    description: pkgData[0]?.destination?.metaDescription,
    keywords: pkgData[0]?.destination?.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/holidays/${params.categorySlug}/${params.destination}`,
    },
  };
}
async function DestinationPage({
  params,
}: {
  params: { categorySlug: string; destination: string };
}) {
  const { categorySlug, destination } = params;
  const packages = await getPackageByDestinationSlug(categorySlug, destination);
  if (!packages || packages.length === 0) return notFound();
  return (
    <section>
      <Hero
        image={packages[0]?.destination?.coverImage?.url || "/Hero1.jpg"}
        title=""
        height="lg"
        align="center"
        overlayOpacity={5}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full flex flex-col items-center justify-center mt-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center">{`Explore Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`}</h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
      </div>
      {/* Show packages under this category */}
      {packages && packages.length > 0 && (
        <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 py-12 px-10">
          {packages.map((pkg: Package) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage ? pkg.coverImage.url : "",
                price: pkg.batch ? pkg.batch[0]?.quad : 9999,
                duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                destination:
                  pkg.destination.state.charAt(0).toUpperCase() +
                  pkg.destination.state.slice(1),
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/holidays/${categorySlug}/${destination}/${pkg.slug}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default DestinationPage;
