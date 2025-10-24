import Hero from "@/components/custom/Hero";
import React from "react";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import { Metadata } from "next";
import NotFoundPage from "@/components/common/Not-Found";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ListBlogSidebar from "@/components/custom/ListBlogSidebar";
import Breadcrumb from "@/components/common/Breadcrumb";

interface Faq {
  question: string;
  answer: string;
}
const getVisaBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/slug/${slug}`
  );
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const page = await getVisaBySlug(params.slug);
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/visa/${page.slug}`,
      type: "website",
    },
  };
}

const getRelatedPages = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/related/${slug}`
  );
  if (!res.ok) throw new Error("Failed to fetch related pages");
  const data = await res.json();
  return data;
};
async function VisaWebPage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const visa = await getVisaBySlug(slug);
  if (!visa) return <NotFoundPage />;

  const relatedPages = await getRelatedPages(slug);

  const relatedPageArray = relatedPages?.data ?? [];

  return (
    <section className="">
      <Hero
        image={visa?.bannerImage?.url || visa.coverImage.url}
        title=""
        overlayOpacity={0}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <article className="w-full md:w-2/3">
          <header className="">
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
        <aside className="w-full md:w-1/3 md:sticky md:top-10 self-start">
          <QueryForm />
          {relatedPageArray.length > 0 && (
            <ListBlogSidebar
              blogs={relatedPageArray}
              title="Related Pages"
              type="latest"
              url="visa"
            />
          )}
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
