import Hero from "@/components/custom/Hero";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ListBlogSidebar from "@/components/custom/ListBlogSidebar";
import Breadcrumb from "@/components/common/Breadcrumb";
import WhyChoose from "@/components/custom/WhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { notFound } from "next/navigation";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import Script from "next/script";

interface Faq {
  question: string;
  answer: string;
}
const getVisaBySlug = async (slug: string, token?: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/slug/${slug}?token=${token}`,
  );
  if (!res.ok) return notFound();
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ token?: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const { token } = await searchParams;
  const page = await getVisaBySlug(slug, token);
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: page?.canonicalUrl
        ? `https://musafirbaba.com${page.canonicalUrl}`
        : `${process.env.NEXT_PUBLIC_SITE_URL}/visa/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url:
        `https://musafirbaba.com${page.canonicalUrl}` ||
        `${process.env.NEXT_PUBLIC_SITE_URL}/visa/${page.slug}`,
      type: "website",
      images: page.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}

const getRelatedPages = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/related/${slug}`,
  );
  if (!res.ok) throw new Error("Failed to fetch related pages");
  const data = await res.json();
  return data;
};
async function VisaWebPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const visa = await getVisaBySlug(slug);
  if (!visa) return notFound();

  const relatedPages = await getRelatedPages(slug);

  const relatedPageArray = relatedPages?.data ?? [];

  const faqSchema = getFAQSchema(visa?.faqs ?? []);
  const breadcrumbSchema = getBreadcrumbSchema("visa/" + slug);
  const webpageSchema = getWebPageSchema(visa.title, "visa/" + slug);
  return (
    <section className="">
      <Hero
        image={visa?.bannerImage?.url || visa.coverImage.url}
        title={visa.title}
        height="lg"
        description={visa.excerpt}
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb title={visa.title} />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 md:py-8 py-3">
        <article className="w-full md:w-2/3 space-y-10">
          {/* <header className="">
            <h1 className="text-3xl md:text-4xl font-bold"></h1>
          </header> */}
          <section className="prose prose-lg max-w-none">
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
                    <section className="prose prose-lg max-w-none">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </article>
        <aside className="w-full md:w-1/3 md:sticky md:top-10 self-start space-y-10 ">
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
      <div className="max-w-7xl mx-auto  gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <WhyChoose />
        <section>
          <Testimonial data={visa.reviews ?? []} />
        </section>
      </div>

      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {visa.schemaType?.includes("Webpage") && (
        <Script
          key="visa-webpage-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }}
        />
      )}
      {visa.schemaType?.includes("FAQ") && (
        <Script
          key="faqs-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
    </section>
  );
}

export default VisaWebPage;
