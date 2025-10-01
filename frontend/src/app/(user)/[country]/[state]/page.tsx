"use client";
import React from "react";
import Hero from "@/components/custom/Hero";
import img1 from "../../../../../public/Hero1.jpg";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import { useParams } from "next/navigation";
import PackageCard from "@/components/custom/PackageCard";
import NotFoundPage from "@/components/common/Not-Found";

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
interface QueryResponse {
  success: boolean;
  data: Package[];
  total: number;
  page: number;
  totalPages: number;
}
const getStatePackages = async (state: string): Promise<QueryResponse> => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${state}`,
    {
      method: "GET",
      headers: { "Content-Type": "appliction/json" },
      credentials: "include",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Satate Packages");
  }
  return res.json();
};
function StatePackages() {
  const { state, country } = useParams<{ state: string; country: string }>();
  const StateName = decodeURIComponent(state);
  const { data, isLoading, isError } = useQuery<QueryResponse>({
    queryKey: ["state-packages"],
    queryFn: () => getStatePackages(StateName),
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <Loader size="lg" message="Loading packages..." />;
  }
  if (isError) {
    toast.error(`No destinations found for ${StateName}`);
    return <NotFoundPage />;
  }

  const packages = data?.data ?? [];
  return (
    <section>
      <Hero
        image={img1.src}
        title="Explore Best Destinations"
        description="Curated itineraries, flexible dates, and best-price guarantees"
        height="lg"
        align="center"
      />
      {/* Show packages under this category */}
      {packages && packages.length > 0 && (
        <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 py-12 px-10">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage ? pkg.coverImage.url : "",
                price: pkg.batch ? pkg.batch[0].quad : 9999,
                duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                destination:
                  pkg.destination.state.charAt(0).toUpperCase() +
                  pkg.destination.state.slice(1),
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/${country}/${state}/${pkg.slug}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default StatePackages;
