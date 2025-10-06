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
// import RelatedPages from "@/components/custom/RelatedPages";
import MembershipCard from "@/components/custom/MembershipCard";
import { QueryDailogBox } from "@/components/common/QueryDailogBox";

interface Faq {
  question: string;
  answer: string;
}
const getWebPageBySlug = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/membership`
  );
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  return data?.data;
};
function VisaWebPage() {
  const slug = "membership";

  const {
    data: visa,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["membership", slug],
    queryFn: getWebPageBySlug,
  });
  if (isLoading) return <Loader size="lg" message="Loading memberships..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;
  return (
    <section className="">
      <div className="w-full flex relative">
        <Hero
          image="/Hero1.jpg"
          title="Membership"
          className="h-[400px] md:h-[500px]"
        />
        <div className="hidden md:block z-10 w-1/4   absolute top-1/2 -translate-y-1/2 right-2 ">
          <QueryForm />
        </div>
        <div className="md:hidden absolute top-1/2 right-8 bottom-5 z-10 rotate-90  ">
          <QueryDailogBox />
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-8 md:px-16 py-10">
        <article className="w-full ">
          <header className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
            {/* Tags */}
            <div className="flex flex-wrap gap-2 mt-2">
              {visa.keywords.map((tag: string) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </header>
          <section className="prose prose-lg max-w-none mt-6">
            <BlogContent html={visa.content} />
          </section>
          <MembershipCard />
          <section className="mt-20">
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
        <aside className="">
          {/* <RelatedPages slug={slug} parent="bookings" /> */}
        </aside>
      </div>
      {/* ✅ JSON-LD Schema
      <Script id="blog-schema" type="application/ld+json">
        {JSON.stringify(schema)}
      </Script> */}
    </section>
  );
}

export default VisaWebPage;
