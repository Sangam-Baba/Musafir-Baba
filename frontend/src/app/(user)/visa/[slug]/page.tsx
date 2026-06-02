import Hero from "@/components/custom/Hero";
import VisaSidebarCalculator from "@/components/visa/VisaSidebarCalculator";
import { Metadata } from "next";
import VisaClient from "./VisaClient";
import ListBlogSidebar from "@/components/custom/ListBlogSidebar";
import Breadcrumb from "@/components/common/Breadcrumb";
import VisaWhyChoose from "@/components/visa/VisaWhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { notFound } from "next/navigation";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import Script from "next/script";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, Mail, HelpCircle } from "lucide-react";
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
        align="left"
        aspectRatio="aspect-[21/5] min-h-[250px]"
        description={visa.excerpt}
        overlayOpacity={100}
      >
        <div className="w-full flex flex-col gap-8 mt-6">
          {/* Ribbon Badge */}
          {visa.visaProcessed && (
            <div className="relative inline-flex items-center gap-2 bg-[#FE5300] text-white pl-3 pr-4 py-1.5 shadow-md self-start">
              <div className="absolute top-0 right-[-12px] h-full border-y-[16px] border-y-transparent border-l-[12px] border-l-[#FE5300]"></div>
              <svg className="w-4 h-4 text-yellow-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
              </svg>
              <span className="font-medium text-xs md:text-sm tracking-wide">{visa.visaProcessed}+ Visas Approved</span>
            </div>
          )}

          {/* Details Row */}
          <div className="flex flex-wrap gap-12 md:gap-24">
            {visa.duration && (
              <div className="flex flex-col">
                <span className="text-gray-300 text-sm md:text-[15px] font-medium tracking-wide mb-1">Processing time</span>
                <span className="text-white text-xl md:text-2xl font-bold tracking-tight">{visa.duration}</span>
              </div>
            )}
            {visa.cost && (
              <div className="flex flex-col">
                <span className="text-gray-300 text-sm md:text-[15px] font-medium tracking-wide mb-1">Starting from</span>
                <span className="text-white text-xl md:text-2xl font-bold tracking-tight">₹ {visa.cost}/-</span>
              </div>
            )}
          </div>
        </div>
      </Hero>
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb title={visa.title} />
      </div>
      <div className="pb-8">
        <VisaClient 
          visa={visa} 
          bottomContent={
            <>
              {relatedPageArray.length > 0 && (
                <div className="pt-6 border-t border-gray-100">
                  <ListBlogSidebar
                    blogs={relatedPageArray}
                    title="Related Pages"
                    type="latest"
                    url="visa"
                  />
                </div>
              )}
              <div className="py-2">
                <VisaWhyChoose />
              </div>
              <section>
                <Testimonial data={visa.reviews ?? []} />
              </section>
            </>
          }
          sidebar={
            <>
              <VisaSidebarCalculator visa={visa} />
              
              {/* Contact Support Block */}
              <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4 mt-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-50 pb-2.5 mb-1">
                  <HelpCircle className="w-4 h-4 text-[#FE5300]" />
                  <h3 className="font-bold font-heading tracking-tight text-gray-900 text-sm">Need Help with Visa?</h3>
                </div>
                
                <a href="tel:+919289602447" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FE5300] transition-colors">
                    <Phone className="w-4 h-4 text-[#FE5300] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[14px] font-bold text-gray-900 group-hover:text-[#FE5300] transition-colors tracking-tight">+91 92896 02447</span>
                </a>
                
                <a href="mailto:care@musafirbaba.com" className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FE5300] transition-colors">
                    <Mail className="w-4 h-4 text-[#FE5300] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[14px] font-bold text-gray-900 group-hover:text-[#FE5300] transition-colors tracking-tight">care@musafirbaba.com</span>
                </a>
              </div>
            </>
          }
        />
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
