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
        description={visa.excerpt}
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb title={visa.title} />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 md:py-8 py-3">
        <article className="w-full md:w-[65%] space-y-10">
          <VisaClient visa={visa} />
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
        </article>
        <aside className="w-full md:w-[35%] md:sticky md:top-24 self-start space-y-6">
          <VisaSidebarCalculator visa={visa} />
          
          {/* Contact Support Block */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.05)] border border-gray-100/90 p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
              <HelpCircle className="w-5 h-5 text-[#FE5300]" />
              <h3 className="font-bold text-gray-800 text-sm">Need Help with Visa?</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Phone className="w-4 h-4 text-[#FE5300]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Call Us 24/7</p>
                  <a href="tel:+919876543210" className="text-sm font-black text-gray-800 hover:text-[#FE5300] transition-colors">+91 98765 43210</a>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-[#FE5300]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Mail className="w-4 h-4 text-[#FE5300]" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Email Support</p>
                  <a href="mailto:care@musafirbaba.com" className="text-sm font-black text-gray-800 hover:text-[#FE5300] transition-colors">care@musafirbaba.com</a>
                </div>
              </div>
            </div>
          </div>
        </aside>
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
