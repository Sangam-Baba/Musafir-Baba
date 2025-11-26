import Hero from "@/components/custom/Hero";
import React from "react";
import { Metadata } from "next";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import RelatedPages from "@/components/custom/RelatedPages";
import NotFoundPage from "@/components/common/Not-Found";
import Breadcrumb from "@/components/common/Breadcrumb";
import WhyChooseUs from "@/components/custom/WhyChooseUS";
import { TestimonialWebpage } from "@/components/custom/TestimonialWebpage";

interface Faq {
  question: string;
  answer: string;
}
const getWebPageBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/${slug}`
  );
  if (!res.ok) return <NotFoundPage />;
  const data = await res.json();
  return data;
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const res = await getWebPageBySlug(params.slug);
  const page = res?.data;
  if (!page)
    return {
      title: "Musafir Baba",
      description: "Musafir Baba",
    };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${page.slug}`,
      type: "website",
    },
  };
}
async function BookingsWebPage({ params }: { params: { slug: string } }) {
  const res = await getWebPageBySlug(params.slug);
  if (!res.data || params.slug === "bookings") return <NotFoundPage />;
  const visa = res?.data;
  return (
    <section className="">
      <Hero
        image={visa?.coverImage?.url || "/Hero1.jpg"}
        title={visa.title}
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <article className="w-full md:w-2/3 space-y-10">
          {/* <header className="">
            <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
          </header> */}
          <section className="prose prose-lg max-w-none mt-6">
            <BlogContent html={visa.content} />
          </section>
          <section className="w-full ">
            <div className="flex flex-col gap-2  py-4">
              <h2 className="text-2xl  font-bold">{`Why Choose MusafirBaba`}</h2>
              <div className="h-1 w-24 bg-[#FE5300] rounded-full"></div>
              <p className="text-gray-600">
                We combine expertise, transparency, and personalised planning to
                deliver unforgettable journeys
              </p>
            </div>

            <WhyChooseUs />
          </section>
          <section>
            <TestimonialWebpage />
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
        <aside className="w-full md:w-1/3 md:sticky md:top-10 self-start">
          <QueryForm />
          <RelatedPages slug={params.slug} parent="visa" />
        </aside>
      </div>
    </section>
  );
}

export default BookingsWebPage;
