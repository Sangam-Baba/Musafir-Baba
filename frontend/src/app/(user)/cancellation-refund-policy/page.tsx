import { Metadata } from "next";
import Hero from "@/components/custom/Hero";
import React from "react";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Faq {
  question: string;
  answer: string;
}
const getWebPageBySlug = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/cancellation-refund-policy`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error("Failed to fetch refund-and-cancellation");
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata(): Promise<Metadata> {
  const page = await getWebPageBySlug();
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/cancellation-refund-policy`,
      type: "website",
    },
  };
}
async function BookingsWebPage() {
  const visa = await getWebPageBySlug();

  return (
    <section className="">
      <Hero
        image={visa?.coverImage?.url || "/Hero1.jpg"}
        title="Cancellation Refund Policy"
      />
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <article className="w-full md:w-5/7">
          <header className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
          </header>
          <section className="prose prose-lg max-w-none mt-6">
            <BlogContent html={visa.content} />
          </section>
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
        <aside className="w-full md:w-2/7">
          <QueryForm />
        </aside>
      </div>
    </section>
  );
}

export default BookingsWebPage;
