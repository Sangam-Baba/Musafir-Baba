"use client";
import React, { use } from "react";
import Hero from "@/components/custom/Hero";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import Breadcrumb from "@/components/common/Breadcrumb";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import PackageCard from "@/components/custom/PackageCard";
import { Faqs } from "@/components/custom/Faqs";
import { ArrowBigRight } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";

interface Plan {
  _id: string;
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
  _id: string;
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
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
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

const getCustomizedPackagesBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/slug/${slug}`,
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      cache: "no-cache",
    }
  );
  if (!res.ok) throw new Error("Failed to fetch Packages");
  const data = await res.json();
  return data?.data;
};

const getRelatedPackages = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/related/${slug}`,
    {
      method: "GET",
      headers: { "content-type": "application/json" },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch Packages");
  const data = await res.json();
  return data?.data;
};

function CustomizedPackagePage({ params }: { params: { slug: string } }) {
  const slug = params.slug as string;
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const {
    data: pkg,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["CustomizedPackages", slug],
    queryFn: () => getCustomizedPackagesBySlug(slug),
    retry: 2,
  });

  const [formData, setFormData] = React.useState({
    date: new Date().toISOString().split("T")[0],
    noOfPeople: 1,
    totalPrice: 0,
    plan: "",
    packageId: "",
    status: "pending",
  });

  const { data: relatedPackages } = useQuery({
    queryKey: ["relatedPackages", slug],
    queryFn: () => getRelatedPackages(slug),
  });
  React.useEffect(() => {
    if (pkg?._id) {
      setFormData((prev) => ({
        ...prev,
        packageId: pkg._id,
      }));
    }
  }, [pkg]);

  if (isLoading) return <Loader size="lg" message="Loading ..." />;
  if (isError) {
    toast.error((error as Error).message);
    return <h1>{(error as Error).message}</h1>;
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, date: e.target.value }));
  };

  const handlePeopleChange = (delta: number) => {
    setFormData((prev) => {
      const newPeople = Math.max(1, prev.noOfPeople + delta);
      const selectedPlan = pkg?.plans.find((p: Plan) => p.title === prev.plan);
      const totalPrice = selectedPlan ? newPeople * selectedPlan.price : 0;
      return { ...prev, noOfPeople: newPeople, totalPrice };
    });
  };

  const handleSelectPlan = (plan: Plan) => {
    setFormData((prev) => ({
      ...prev,
      plan: plan.title,
      totalPrice: plan.price * prev.noOfPeople,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.plan) {
      toast.error("Please select a plan before booking");
      return;
    }

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourbooking`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      }
    );

    if (res.ok) {
      toast.success("Package Booked Successfully!");
      const data = await res.json();
      const bookingId = data?.data?._id;
      router.replace(`/customized-tour-package/${slug}/${bookingId}`);
    } else {
      toast.error("Failed to book package. Try again.");
    }
  };

  return (
    <section className="w-full mb-12">
      <Hero
        image={pkg?.coverImage?.url || "/Hero1.jpg"}
        title=""
        align="center"
        height="lg"
        overlayOpacity={5}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1>
        <div className="flex gap-2 mb-6">
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
      </div>

      <section className="w-full max-w-7xl mx-auto px-4   gap-4">
        <form onSubmit={handleSubmit} method="post">
          <div className="w-full max-w-7xl mx-auto px-4  flex flex-col-reverse md:flex-row gap-4">
            {/* LEFT SIDE */}
            <div className="w-full md:w-2/3 px-4 ">
              <Accordion
                type="single"
                collapsible
                className="w-full flex flex-col gap-4 "
                defaultValue="plan-0"
              >
                {pkg.plans.map((plan: Plan, i: number) => (
                  <AccordionItem
                    value={`plan-${i}`}
                    key={i}
                    className={`border-2   shadow-none ${
                      formData.plan === plan.title
                        ? "border-[#FE5300]"
                        : "border-gray-400"
                    } rounded-2xl p-4`}
                  >
                    <AccordionTrigger
                      onClick={() => handleSelectPlan(plan)}
                      className="flex justify-between w-full"
                    >
                      <h2 className="text-2xl font-bold">{plan.title}</h2>
                      <div className="text-right">
                        <p>
                          {formData.noOfPeople} Adults x ₹{plan.price}
                        </p>
                        <p>₹{formData.totalPrice}</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="text-justify ">
                      <p className="font-bold">Includes:</p>
                      <p>{plan.include}</p>
                      <div className="w-full h-0.5 bg-gray-300 my-3"></div>
                      <div className="flex justify-between items-center">
                        <div>
                          <p>
                            {formData.noOfPeople} Adults × ₹{plan.price}
                          </p>
                          <p>
                            Total:{" "}
                            <span className="font-bold">
                              ₹{" "}
                              {formData.plan === plan.title
                                ? formData.totalPrice
                                : plan.price * formData.noOfPeople}
                            </span>
                          </p>
                        </div>
                        <Button
                          type="submit"
                          className="bg-[#FE5300] hover:bg-[#FE5300]/90 font-bold text-lg"
                          onClick={() => handleSelectPlan(plan)}
                        >
                          Book Now
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>

            {/* RIGHT SIDE */}
            <div className="w-full md:w-1/3 px-4 ">
              <Card className="shadow-lg">
                <CardHeader>
                  <p>Starting from</p>
                  <CardTitle className="text-4xl font-semibold tracking-tight text-[#FE5300]">
                    ₹ {pkg.plans[0].price}
                  </CardTitle>
                  <span className="text-sm text-muted-foreground">
                    per person
                  </span>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Select Date
                    </label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={handleDateChange}
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="flex-1">Adults (12+ years)</p>
                    <Button
                      type="button"
                      onClick={() => handlePeopleChange(-1)}
                      className="bg-[#FE5300] hover:bg-[#FE5300]/90 px-3"
                    >
                      -
                    </Button>
                    <Input
                      readOnly
                      value={formData.noOfPeople}
                      className="w-12 text-center"
                    />
                    <Button
                      type="button"
                      onClick={() => handlePeopleChange(1)}
                      className="bg-[#FE5300] hover:bg-[#FE5300]/90 px-3"
                    >
                      +
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </section>

      <div className="w-full max-w-7xl mx-auto px-4  flex flex-col gap-4">
        {/* Itinerary */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold">Itinerary</h2>
          <p className="w-16 h-1 bg-[#FE5300] mb-6 mt-2 rounded-full"></p>

          <Accordion type="multiple" className="relative space-y-4">
            {pkg.itinerary.map((item: Itinerary, i: number) => (
              <AccordionItem
                key={i}
                value={`itinerary-${i}`}
                className="relative border-l-2 border-dotted border-[#FE5300] border-b-0 pl-8"
              >
                {/* Timeline circle */}
                <div className="absolute -left-[11px] top-4 w-5 h-5 rounded-full border-2 border-[#FE5300] bg-white flex items-center justify-center shadow-sm">
                  <div className="w-2 h-2 rounded-full bg-[#FE5300]" />
                </div>

                {/* Accordion Header */}
                <AccordionTrigger
                  className="text-lg font-semibold text-gray-800 hover:no-underline py-2 
                     flex justify-between items-center transition-colors duration-200 
                     hover:text-[#FE5300] focus-visible:ring-0 focus-visible:outline-none"
                >
                  {item.title}
                </AccordionTrigger>

                {/* Accordion Content */}
                <AccordionContent className="text-gray-600 text-sm ">
                  {item.description}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Show packages under this category */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold">Nearby Tours</h2>
          <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
          {relatedPackages && relatedPackages.length > 0 && (
            <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10">
              {relatedPackages.map((pkg: Package) => (
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
        </div>
        {/* Highlights */}
        <div className="w-full  mt-8">
          <h2 className="text-2xl font-bold">Highlights</h2>
          <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
          {pkg.highlight.map((item: Highlight, i: number) => (
            <div key={i} className="flex  gap-2  p-4">
              <ArrowBigRight className="w-6 h-6 text-[#FE5300]" />
              <p className="text-lg font-semibold">{item.title}</p>
            </div>
          ))}
        </div>

        {/* description */}
        <div className="w-full mt-8">
          <h2 className="text-2xl font-bold">About This Tour</h2>
          <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
          {pkg.description}
        </div>
      </div>

      <Faqs faqs={pkg.faqs.map((faq: Faqs) => ({ id: faq._id, ...faq }))} />
    </section>
  );
}

export default CustomizedPackagePage;
