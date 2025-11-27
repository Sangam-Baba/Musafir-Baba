"use client";

import React from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { useCustomizedBookingStore } from "@/store/useCutomizedBookingStore";
import Hero from "@/components/custom/Hero";
import { Loader } from "@/components/custom/loader";
import Breadcrumb from "@/components/common/Breadcrumb";
import { Clock, MapPin, ArrowBigRight } from "lucide-react";
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
import WhyChoose from "@/components/custom/WhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { Reviews } from "@/app/admin/holidays/new/page";
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
  description: string;
  slug: string;
  coverImage: CoverImage;
  gallery: CoverImage[];
  plans: Plan[];
  reviews: Reviews[];
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
export default function CustomizedPackageClient({
  pkg,
  relatedPackages,
}: {
  pkg: Package;
  relatedPackages: Package[];
}) {
  const router = useRouter();
  const accessToken = useAuthStore((state) => state.accessToken);
  const openDialog = useAuthDialogStore((state) => state.openDialog);
  const setFormBookData = useCustomizedBookingStore(
    (state) => state.setFormBookData
  );

  const [formData, setFormData] = React.useState({
    date: new Date().toISOString().split("T")[0],
    noOfPeople: 1,
    totalPrice: 0,
    plan: "",
    packageId: pkg?._id,
    status: "pending",
  });

  const handleSelectPlan = (plan: Plan) => {
    setFormData((prev) => ({
      ...prev,
      plan: plan.title,
      totalPrice: plan.price * prev.noOfPeople,
    }));
  };

  const handlePeopleChange = (delta: number) => {
    setFormData((prev) => {
      const newPeople = Math.max(1, prev.noOfPeople + delta);
      const selectedPlan = pkg?.plans.find((p: Plan) => p.title === prev.plan);
      const totalPrice = selectedPlan ? newPeople * selectedPlan.price : 0;
      return { ...prev, noOfPeople: newPeople, totalPrice };
    });
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, date: e.target.value }));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.plan) {
      toast.error("Please select a plan before booking");
      return;
    }

    setFormBookData(formData);

    const redirectUrl = `/holidays/customised-tour-packages/${pkg?.destination?.state}/${pkg.slug}/${pkg._id}`;

    if (!accessToken) {
      openDialog("login", undefined, redirectUrl);
    } else {
      router.push(redirectUrl);
    }
  };

  if (!pkg) return <Loader message="Loading..." />;

  return (
    <section className="w-full mb-12">
      <Hero
        image={pkg?.coverImage?.url || "/Hero1.jpg"}
        title={pkg.title}
        align="center"
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        {/* <h1 className="text-3xl font-bold mb-4">{pkg.title}</h1> */}
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
            <div className="w-full md:w-2/3 px-4">
              <Accordion
                type="single"
                collapsible
                className="w-full flex flex-col divide-y divide-gray-300 border border-gray-300 rounded-2xl overflow-hidden"
                defaultValue="plan-0"
              >
                {pkg.plans.map((plan: Plan, i: number) => (
                  <AccordionItem
                    value={`plan-${i}`}
                    key={i}
                    className={`px-4 py-3 transition-all ${
                      formData.plan === plan.title
                        ? "bg-orange-50 border-l-4 border-[#FE5300]"
                        : "border-l-4 border-transparent"
                    }`}
                  >
                    <AccordionTrigger
                      onClick={() => handleSelectPlan(plan)}
                      className="flex justify-between w-full"
                    >
                      <h2 className="text-2xl font-bold">{plan.title}</h2>
                      <div className="text-right">
                        <p>
                          {formData.noOfPeople} Adults × ₹{plan.price}
                        </p>
                        <p>₹{formData.noOfPeople * plan.price}</p>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="text-justify pt-3">
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

        {/* Show related packages under this category */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold">Nearby Tours</h2>
          <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
          {relatedPackages && relatedPackages.length > 0 && (
            <div className="mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10 my-10">
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
                  url={`/holidays/customised-tour-packages/${pkg?.destination?.state}/${pkg.slug}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <Faqs faqs={pkg.faqs.map((faq: Faqs) => ({ id: faq._id, ...faq }))} />
      <WhyChoose />
      <Testimonial data={pkg.reviews ?? []} />
    </section>
  );
}
