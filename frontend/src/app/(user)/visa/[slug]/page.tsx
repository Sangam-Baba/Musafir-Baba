import Hero from "@/components/custom/Hero";
import VisaSidebarCalculator from "@/components/visa/VisaSidebarCalculator";
import { Metadata } from "next";
import VisaClient from "./VisaClient";
import ListBlogSidebar from "@/components/custom/ListBlogSidebar";
import Breadcrumb from "@/components/common/Breadcrumb";
import VisaWhyChoose from "@/components/visa/VisaWhyChoose";
import { notFound } from "next/navigation";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import Script from "next/script";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Phone, Mail, HelpCircle } from "lucide-react";
import { CONTACT_INFO } from "@/config/contact";
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

  let displayDuration = visa.duration;
  let displayCost = visa.cost;

  if (visa.visas && visa.visas.length > 0) {
    let lowestGovFee = Infinity;
    
    visa.visas.forEach((card: any) => {
      const entries = card.validityEntries && card.validityEntries.length > 0 ? card.validityEntries : [card];
      
      entries.forEach((entry: any) => {
        const stdGovFee = entry.governmentFee ?? card.governmentFee;
        const expGovFee = entry.expressGovernmentFee ?? card.expressGovernmentFee;
        
        if (stdGovFee !== undefined && stdGovFee !== null && stdGovFee > 0 && stdGovFee < lowestGovFee) {
          lowestGovFee = stdGovFee;
          displayDuration = entry.processTime || card.processTime || entry.visaDuration || card.visaDuration || visa.duration;
          displayCost = stdGovFee;
        }
        
        if (expGovFee !== undefined && expGovFee !== null && expGovFee > 0 && expGovFee < lowestGovFee) {
          lowestGovFee = expGovFee;
          displayDuration = entry.expressVisaDuration || card.expressVisaDuration || entry.visaDuration || card.visaDuration || visa.duration;
          displayCost = expGovFee;
        }
      });
    });
  }

  return (
    <section className="">
      <Hero
        image={visa?.bannerImage?.url || visa.coverImage.url}
        title={visa.title}
        height="lg"
        align="left"
        aspectRatio="aspect-[21/5] min-h-[250px] md:min-h-[420px]"
        description={visa.excerpt}
        overlayOpacity={100}
      >
        <div className="w-full flex flex-col gap-4 md:gap-5 mt-4 md:mt-6">
          {/* Ribbon Badges */}
          <div className="flex flex-wrap gap-5 items-center self-start">
            {visa.visaProcessed && (
              <div className="relative inline-flex items-center gap-2 bg-[#FE5300] text-white pl-3 pr-4 py-1.5 shadow-md">
                <div className="absolute top-0 right-[-12px] h-full border-y-[16px] border-y-transparent border-l-[12px] border-l-[#FE5300]"></div>
                <svg className="w-4 h-4 text-yellow-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23 12l-2.44-2.78.34-3.68-3.61-.82-1.89-3.18L12 3 8.6 1.54 6.71 4.72l-3.61.81.34 3.68L1 12l2.44 2.78-.34 3.69 3.61.82 1.89 3.18L12 21l3.4 1.46 1.89-3.18 3.61-.82-.34-3.68L23 12zm-13 5l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
                </svg>
                <span className="font-medium text-xs md:text-sm tracking-wide">{visa.visaProcessed}+ Visas Approved</span>
              </div>
            )}
            
            <div className="relative inline-flex items-center gap-2 bg-[#39FF14] text-gray-900 pl-3 pr-4 py-1.5 shadow-[0_0_20px_rgba(57,255,20,0.6)]">
              <div className="absolute top-0 right-[-12px] h-full border-y-[16px] border-y-transparent border-l-[12px] border-l-[#39FF14]"></div>
              <svg className="w-4 h-4 text-gray-900" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"></path>
                <path d="M9 12l2 2 4-4"></path>
              </svg>
              <span className="font-extrabold text-xs md:text-sm tracking-wide">99.34% Approval Rate</span>
            </div>
          </div>

          {/* Details Row — fixed spacing, not dependent on H1 */}
          <div className="flex flex-wrap gap-6 md:gap-24 mt-4 md:mt-6">
            {displayDuration && (
              <div className="flex flex-col">
                <span className="text-gray-300 text-sm md:text-[15px] font-medium tracking-wide mb-1">Processing time</span>
                <span className="text-white text-xl md:text-2xl font-bold tracking-tight">{displayDuration}</span>
              </div>
            )}
            {displayCost && (
              <div className="flex flex-col">
                <span className="text-gray-300 text-sm md:text-[15px] font-medium tracking-wide mb-1">Starting from</span>
                <span className="text-white text-xl md:text-2xl font-bold tracking-tight">₹ {Number(displayCost).toLocaleString('en-IN')}/-</span>
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
                
                <a href={`tel:${CONTACT_INFO.PHONE_NUMBER}`} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 group-hover:bg-[#FE5300] transition-colors">
                    <Phone className="w-4 h-4 text-[#FE5300] group-hover:text-white transition-colors" />
                  </div>
                  <span className="text-[14px] font-bold text-gray-900 group-hover:text-[#FE5300] transition-colors tracking-tight">{CONTACT_INFO.PHONE_NUMBER_FORMATTED}</span>
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
