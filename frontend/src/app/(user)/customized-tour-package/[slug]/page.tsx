"use client";
import React from "react";
import Hero from "@/components/custom/Hero";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import Breadcrumb from "@/components/common/Breadcrumb";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Plan {
  title: string;
  include: string;
  price: number;
}
interface Highlight {
  title: string;
}
interface Itinerary {
  title: string;
  description: string;
}
interface Faqs {
  question: string;
  answer: string;
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
  gallery: CoverImage[];
  plans: Plan[];
  duration: {
    days: number;
    nights: number;
  };
  highlight: Highlight[];
  itinerary: Itinerary[];
  faqs: Faqs[];
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

const getCustomizedPackagesBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/slug/${slug}`,
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

function CustomizedPackagePage({ params }: { params: { slug: string } }) {
  const slug = params.slug as string;
  const {
    data: Package,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["CustomizedPackages", slug],
    queryFn: () => getCustomizedPackagesBySlug(slug),
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
        image={Package?.coverImage?.url || "/Hero1.jpg"}
        title=""
        align="center"
        height="lg"
        overlayOpacity={5}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      {/* Show category details */}
      <div className="w-full max-w-7xl mx-auto px-4  my-4 md:flex">
        <section className="w-full md:w-2/3 px-4  py-16">
          <div className="flex flex-col gap-2  max-w-7xl mx-auto">
            {/* Tabs */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{Package.title}</h1>
              <div className="flex gap-2">
                <span className="flex items-center gap-1">
                  <MapPin color="#FE5300" size={14} />{" "}
                  {Package.destination.state.charAt(0).toUpperCase() +
                    Package.destination.state.slice(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock color="#FE5300" size={14} /> {Package.duration.days}D/
                  {Package.duration.nights}N
                </span>
              </div>
              {/* <p className="text-gray-600">{pkg.metaDescription}</p> */}
            </div>
          </div>
          <section></section>
        </section>

        <div className="w-full md:w-1/3 px-4 py-16 ">
          <Card className="mb-4 shadow-lg">
            <CardHeader className="flex flex-col justify-between  ">
              <p>Starting from </p>
              <CardTitle className="text-4xl font-semibold tracking-tight text-[#FE5300]">
                ₹ {Package.plans[0].price}{" "}
              </CardTitle>
              <span className="text-sm text-muted-foreground">per person</span>
            </CardHeader>
            <CardContent className="space-y-2">
              <Input type="date" />
              <div className="flex gap-2">
                <p>Adult (12+ years)</p>
                <Button className="bg-[#FE5300] hover:bg-[#FE5300] font-bold text-xl">
                  -
                </Button>
                <Input type="number" className="w-12 text-center" />
                <Button className="bg-[#FE5300] hover:bg-[#FE5300] font-bold text-xl">
                  +
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}

export default CustomizedPackagePage;
