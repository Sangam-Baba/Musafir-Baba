import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import { notFound } from "next/navigation";
import React from "react";
import CustomizedTourClient from "../CustomizedTourClient";

interface Plan {
  title: string;
  include: string;
  price: number;
}

interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
export interface CustomizedPackageInterface {
  _id: string;
  title: string;
  slug: string;
  coverImage: CoverImage;
  plans: Plan[];
  duration: {
    days: number;
    nights: number;
  };
  destination: Destination;
  status: "draft" | "published";
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
}
export async function getPackageByDestinationSlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage?destination=${slug}`,
    {
      cache: "no-cache",
    }
  );
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}
export async function generateMetadata({
  params,
}: {
  params: { destination: string };
}) {
  const { destination } = await params;
  return {
    title: `MusafirBaba | Customised Packages in ${
      destination.charAt(0).toUpperCase() + destination.slice(1)
    }`,
    description: `Customised Packages in ${
      destination.charAt(0).toUpperCase() + destination.slice(1)
    }`,
  };
}
async function DestinationPage({
  params,
}: {
  params: { destination: string };
}) {
  const { destination } = await params;
  const packages = await getPackageByDestinationSlug(destination);
  if (!packages || packages.length === 0) return notFound();
  return (
    <section>
      <Hero
        image={packages[0]?.coverImage?.url}
        title={`Explore Customised Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`}
        height="lg"
        align="center"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-5">
        <Breadcrumb />
      </div>

      {/* Show packages under this category */}
      <CustomizedTourClient allPkgs={packages} />
    </section>
  );
}

export default DestinationPage;
