"use client";
import React from "react";
import Hero from "@/components/custom/Hero";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import PackageCard from "@/components/custom/PackageCard";
import Breadcrumb from "@/components/common/Breadcrumb";

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
interface Package {
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

const getAllCustomizedPackages = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/`,
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-cache",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch Packages");
  }
  const data = await res.json();
  return data?.data;
};

function CustomizedPackagePage() {
  const {
    data: AllPackages,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["category"],
    queryFn: getAllCustomizedPackages,
    retry: 2,
  });

  if (isLoading) {
    return <Loader size="lg" message="Loading ..." />;
  }
  if (isError) {
    toast.error(error.message);
    return <h1>{error.message}</h1>;
  }

  return (
    <section className="w-full mb-12">
      <Hero
        image={AllPackages[0]?.coverImage?.url || "/Hero1.jpg"}
        title=""
        align="center"
        height="lg"
        overlayOpacity={5}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      {/* Show category details */}
      <div className="max-w-4xl mx-auto flex flex-col items-center text-center my-12">
        <h1 className="text-3xl font-bold">Customized Packages</h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
        <p className="mt-2 text-muted-foreground">
          This is customized tour packages
        </p>
      </div>

      {/* Show packages under this category */}
      {AllPackages && AllPackages.length > 0 && (
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10">
          {AllPackages.map((pkg: Package) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage?.url ?? "",
                price: pkg?.plans ? pkg?.plans[0]?.price : 999,
                duration: `${pkg.duration?.nights}N/${pkg.duration?.days}D`,
                destination: pkg.destination?.name ?? "",
                batch: [],
              }}
              url={`/customized-tour-package/${pkg.slug}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default CustomizedPackagePage;
