"use client";

import Hero from "@/components/custom/Hero";
import React, { useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { ImageGallery } from "@/components/custom/ImageGallery";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { usePathname } from "next/navigation";
import { Loader } from "@/components/custom/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@radix-ui/react-accordion";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import QueryForm from "@/components/custom/QueryForm";
import { ItineryDialog } from "@/components/custom/ItineryDialog";
import NotFoundPage from "@/components/common/Not-Found";
import { Clock, MapPin } from "lucide-react";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { AuthDialog } from "@/components/auth/AuthDialog";
type TabKey =
  | "description"
  | "highlights"
  | "itineraries"
  | "includeexclude"
  | "faqs";

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

function SlugClients({
  slug,
  state,
  country,
}: {
  slug: string;
  state: string;
  country: string;
}) {
  const auth = useAuthStore();
  const pathName = usePathname();
  const StateName = state;
  const router = useRouter();

  const [active, setActive] = useState<TabKey>("description");

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
    { key: "highlights", label: "Highlights" },
    { key: "itineraries", label: "Itineraries" },
    { key: "includeexclude", label: "Includes & Excludes" },
    { key: "faqs", label: "FAQs" },
  ];

  const { data, isLoading, isError } = useQuery<QueryResponse>({
    queryKey: ["package", state, slug],
    queryFn: () => getSinglePackages(StateName, slug),
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) return <Loader size="lg" message="Loading package..." />;
  if (isError) {
    toast.error(`No package found for ${StateName}`);
    return <NotFoundPage />;
  }

  const pkg = data?.data[0];

  if (!pkg) {
    return <p>No package found.</p>;
  }
  const price = pkg.batch?.length ? pkg?.batch[0].quad : 3999;
  const dicountedPrice = pkg.batch?.length ? pkg?.batch[0].quadDiscount : 5999;

  return (
    <section>
      <div className="relative">
        <div className="absolute z-20 w-full flex justify-center bottom-25 px-4">
          <ItineryDialog
            title={pkg.title}
            description={pkg.description.slice(0, 50)}
            url={pkg.itineraryDownload?.url ?? ""}
            img={pkg.coverImage?.url}
            packageId={pkg._id}
          />
        </div>
        <Hero
          image={pkg.coverImage.url ?? ""}
          title=""
          description=""
          align="center"
          height="lg"
          overlayOpacity={20}
        />
      </div>

      <div className="w-full max-w-7xl mx-auto px-4  py-8 md:flex">
        <section className="w-full md:w-2/3 px-4  py-16">
          <div className="flex flex-col gap-2  max-w-7xl mx-auto">
            {/* Tabs */}
            <div>
              <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1>
              <div className="flex gap-2">
                <span className="flex items-center gap-1">
                  <MapPin color="#FE5300" size={14} />{" "}
                  {pkg.destination.state.charAt(0).toUpperCase() +
                    pkg.destination.state.slice(1)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock color="#FE5300" size={14} /> {pkg.duration.days}D/
                  {pkg.duration.nights}N
                </span>
              </div>
              {/* <p className="text-gray-600">{pkg.metaDescription}</p> */}
            </div>
            <div className="flex flex-wrap  w-full gap-2 mt-4 ">
              {tabs.map((tab) => (
                <Button
                  key={tab.key}
                  size="lg"
                  onClick={() => setActive(tab.key)}
                  className={`mt-4 ${
                    active === tab.key ? "bg-[#FE5300]" : "bg-gray-400"
                  }`}
                >
                  {tab.label}
                </Button>
              ))}
            </div>

            {/* Content */}
            <div className="mt-10 w-full">
              {active === "description" && (
                <div>
                  <h2 className="font-bold text-lg mb-2">About This Tour</h2>
                  <p className="text-justify whitespace-pre-line">
                    {pkg.description}
                  </p>
                </div>
              )}

              {active === "highlights" && (
                <ul className="list-disc list-inside">
                  {pkg.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}

              {active === "itineraries" && (
                <Accordion type="single" collapsible className="w-full">
                  {pkg.itinerary.map((item, i) => (
                    <AccordionItem
                      value={`itinerary-${i}`}
                      key={i}
                      className="rounded-2xl shadow-lg p-4"
                    >
                      <AccordionTrigger>{item.title}</AccordionTrigger>
                      <AccordionContent className="text-justify whitespace-pre-line">
                        {item.description}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {active === "includeexclude" && (
                <div>
                  <h2 className="font-bold">Includes</h2>
                  <ul className="list-disc list-inside">
                    {pkg.inclusions.map((inc, i) => (
                      <li key={i}>{inc}</li>
                    ))}
                  </ul>
                  <h2 className="font-bold mt-4">Excludes</h2>
                  <ul className="list-disc list-inside">
                    {pkg.exclusions.map((exc, i) => (
                      <li key={i}>{exc}</li>
                    ))}
                  </ul>
                </div>
              )}

              {active === "faqs" && (
                <Accordion type="single" collapsible className="w-full">
                  {pkg.faqs.map((faq, i) => (
                    <AccordionItem
                      value={`faq-${i}`}
                      key={i}
                      className="rounded-2xl shadow-lg p-4"
                    >
                      <AccordionTrigger>{faq.question}</AccordionTrigger>
                      <AccordionContent className="text-justify">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </div>
        </section>
        <div className="w-full md:w-1/3 px-4 py-16 ">
          <Card className="mb-4 shadow-lg">
            <CardHeader className="flex flex-col justify-between  ">
              <p>
                Starting from{" "}
                <span className="text-sm text-muted-foreground line-through">
                  ₹ {dicountedPrice}
                </span>
              </p>
              <CardTitle className="text-4xl font-semibold tracking-tight text-[#FE5300]">
                ₹ {price}{" "}
              </CardTitle>
              <span className="text-sm text-muted-foreground">per person</span>
            </CardHeader>
            <Button
              onClick={() => {
                if (!auth.isAuthenticated) {
                  useAuthDialogStore
                    .getState()
                    .openDialog("login", undefined, `${pathName}/${pkg._id}`);
                } else {
                  router.push(`./${pkg.slug}/${pkg._id}`);
                }
              }}
              size={"lg"}
              className="m-4 bg-[#FE5300] hover:bg-[#FE5300] font-bold text-xl"
            >
              Book Now
            </Button>
          </Card>
          <QueryForm />
        </div>
      </div>
      <ImageGallery />
      <AuthDialog />
    </section>
  );
}

export default SlugClients;
