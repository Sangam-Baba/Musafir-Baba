"use client";
import Hero from "@/components/custom/Hero";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import { Loader } from "@/components/custom/loader";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Map from "@/components/custom/Map";
interface Faq {
  question: string;
  answer: string;
}
const getWebPageBySlug = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/contact-us`
  );
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  return data?.data;
};
function VisaWebPage() {
  const slug = "contact-us";

  const {
    data: visa,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["visa", slug],
    queryFn: getWebPageBySlug,
  });
  if (isLoading) return <Loader size="lg" message="Loading Contact..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;
  return (
    <section className="">
      <Hero image={visa?.coverImage?.url || "/Hero1.jpg"} title="Contact Us" />
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <article className="w-full  flex flex-col items-center">
          <header className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
          </header>
          <div className="flex ietms-center">
            <section className="prose prose-lg max-w-none mt-6 text-center">
              <BlogContent html={visa.content} />
            </section>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
            <Card className="mt-8 bg-[#CDFFC9] ">
              <CardContent className="flex  flex-col items-center gap-4">
                <MapPin className=" h-10 w-10" color="#FF5733" />
                <p className="font-bold text-2xl text-center">Our Location</p>
                <p className="text-center">
                  1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near
                  Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi,
                  Delhi, 110043
                </p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#FE5000]">
              <CardContent className="flex  flex-col items-center gap-4">
                <Phone className=" h-10 w-10" color="#CDFFC9" />
                <p className="font-bold text-2xl text-center text-white">
                  Phone
                </p>
                <p className="text-center text-white">Tour: +91 92896 02447 </p>
                <p className="text-center text-white">Visa: +91 93556 63591</p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#CDFFC9] ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Mail className=" h-10 w-10" color="#FF5733" />
                <p className="font-bold text-2xl text-center">Email</p>
                <p className="text-center">care@musafirbaba.com</p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#FE5000]">
              <CardContent className="flex  flex-col items-center gap-4">
                <Clock className=" h-10 w-10" color="#CDFFC9" />
                <p className="font-bold text-2xl text-center text-white">
                  Working Hours
                </p>
                <p className="text-center text-white">
                  Mon-Sat : 9:00 AM to 6:00 PM <br />
                  Sun : Closed
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-20 w-full flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2 h-[400px] md:h-full">
              <Map address="1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi, Delhi, 110043" />
            </div>
            <div className="w-full md:w-1/2">
              <QueryForm />
            </div>
          </div>

          <section>
            <h2 className="text-2xl font-bold mt-8">{`FAQ's`}</h2>
            <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
            <Accordion type="single" collapsible className="w-full">
              {visa.faqs.map((faq: Faq, i: number) => (
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
          </section>
        </article>
      </div>
      {/* ✅ JSON-LD Schema
      <Script id="blog-schema" type="application/ld+json">
        {JSON.stringify(schema)}
      </Script> */}
    </section>
  );
}

export default VisaWebPage;
