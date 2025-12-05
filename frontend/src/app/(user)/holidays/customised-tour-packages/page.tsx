import React from "react";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import { getCategoryBySlug } from "../[categorySlug]/page";
import CustomizedTourClient from "./CustomizedTourClient";
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

export const getAllCustomizedPackages = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage`,
    {
      cache: "no-cache",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Packages");
  }
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata() {
  return {
    title: "Customised Tour Packages – Tailor-Made Holidays for Every Traveler",
    description:
      "Explore customised tour packages designed around your interests, budget, and travel style. From luxury getaways to family vacations, we plan every detail so you can enjoy a truly personalised holiday experience.",
    alternates: {
      canonical: "https://musafirbaba.com/holidays/customised-tour-packages",
    },
    openGraph: {
      title:
        "Customised Tour Packages – Tailor-Made Holidays for Every Traveler",
      description:
        "Explore customised tour packages designed around your interests, budget, and travel style. From luxury getaways to family vacations, we plan every detail so you can enjoy a truly personalised holiday experience.",
      url: "https://musafirbaba.com/holidays/customised-tour-packages",
      siteName: "MusafirBaba",
      images: [
        {
          url: "https://res.cloudinary.com/dmmsemrty/image/upload/v1762488352/rolvmorbutnkmwgnmh5s.jpg",
          width: 1200,
          height: 630,
          alt: "MusafirBaba Travel",
        },
      ],
      type: "website",
    },
  };
}

async function CustomizedPackagePage() {
  const AllPackages = await getAllCustomizedPackages();
  const res = await getCategoryBySlug("customised-tour-packages");
  const { category } = res?.data ?? {};
  return (
    <section className="w-full mb-12">
      <Hero
        image={AllPackages[0]?.coverImage?.url || "/Hero1.jpg"}
        title={category?.name}
        description={category?.description}
        align="center"
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      {/* Show packages under this category */}
      <CustomizedTourClient allPkgs={AllPackages} />
    </section>
  );
}

export default CustomizedPackagePage;
