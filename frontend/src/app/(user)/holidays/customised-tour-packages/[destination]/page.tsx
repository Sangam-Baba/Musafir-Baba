import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
// import PackageCard from "@/components/custom/PackageCard";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";

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
async function getPackageByDestinationSlug(slug: string) {
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
  const { destination } = params;
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
  const { destination } = params;
  const packages = await getPackageByDestinationSlug(destination);
  if (!packages || packages.length === 0) return notFound();
  return (
    <section>
      <Hero
        image={packages[0]?.coverImage?.url}
        title=""
        height="lg"
        align="center"
        overlayOpacity={5}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-5">
        <Breadcrumb />
      </div>
      <div className="w-full flex flex-col items-center justify-center mt-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center">{`Explore Customised Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`}</h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
      </div>

      {/* Show packages under this category */}
      {packages && packages.length > 0 && (
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10 mt-10">
          {packages.map((pkg: Package) => (
            <Link
              key={pkg._id}
              className="cursor-pointer"
              href={`/holidays/customised-tour-packages/${pkg.destination?.state}/${pkg.slug}`}
            >
              <Card className="overflow-hidden pt-0 pb-0 rounded-2xl shadow-md hover:shadow-xl transition cursor-pointer">
                {/* Image + Price tag */}
                <div className="relative h-56 w-full">
                  <Image
                    src={pkg.coverImage.url}
                    alt={pkg.coverImage.alt}
                    width={500}
                    height={500}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute top-3 right-3 bg-[#FE5300] text-white px-3 py-1 rounded-full font-semibold text-sm shadow">
                    ₹{pkg.plans[0].price.toLocaleString("en-IN")}/- onwards
                  </div>
                </div>

                <CardContent className="p-4 space-y-3">
                  {/* Title */}
                  <h3 className="font-semibold text-lg line-clamp-1">
                    {pkg.title}
                  </h3>

                  {/* Duration & Location */}
                  <div className="flex items-center justify-between text-sm text-gray-700 mt-2">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>
                        {pkg.duration?.nights}N/{pkg.duration?.days}D,
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-blue-600" />
                      <span>{pkg.destination?.name}</span>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-1">
                    Any Date of your choice
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default DestinationPage;
