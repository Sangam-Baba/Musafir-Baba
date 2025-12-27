import { Metadata } from "next";
import Hero from "@/components/custom/Hero";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import MembershipCard from "@/components/custom/MembershipCard";
// import { QueryDailogBox } from "@/components/common/QueryDailogBox";
import Breadcrumb from "@/components/common/Breadcrumb";
import { getWebPageBySlug } from "@/app/(user)/[...slug]/page";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import Script from "next/script";

interface Faq {
  question: string;
  answer: string;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await getWebPageBySlug("membership");
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/membership`,
    },
    keywords: page.keywords,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/membership`,
      type: "website",
    },
  };
}

async function VisaWebPage() {
  const visa = await getWebPageBySlug("membership");

  const breadcrumbSchema = getBreadcrumbSchema("Membership");
  const webpageSchema = getWebPageSchema("Membership", "membership");
  return (
    <section className="">
      <div className="w-full flex relative">
        <Hero
          image={visa?.coverImage?.url || "/Hero1.jpg"}
          title={visa.title}
          overlayOpacity={100}
        />
      </div>
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>

      <div className="max-w-7xl mx-auto flex flex-col  gap-8 px-4 md:px-6 lg:py-8">
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* maincontent */}
          <article className="w-full md:w-4/7 ">
            {/* <header className=" space-y-2">
              <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
            </header> */}
            <section className="prose prose-lg max-w-none mt-6">
              <BlogContent html={visa.content} />
            </section>
          </article>
          {/* QueryForm */}
          <div className="w-full md:w-3/7 md:sticky top-20">
            <QueryForm />
          </div>
        </div>

        <MembershipCard />
        {/* Faqs */}
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
      </div>
      <Script
        id="breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {visa?.schemaType?.includes("Webpage") && (
        <Script
          id="breadcrumb"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />
      )}
    </section>
  );
}

export default VisaWebPage;
