import { Metadata } from "next";
import MainWebPage from "@/components/custom/MainWebpage";
import { notFound } from "next/navigation";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import Script from "next/script";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

export const getWebPageBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/slug?slug=${slug}`,
    {
      next: { revalidate: 120 },
    }
  );

  if (!res.ok) return notFound();
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}): Promise<Metadata> {
  const { slug } = (await params) || [];
  const fullSlug = slug.join("/");
  const page = await getWebPageBySlug(fullSlug);

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/${fullSlug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `https://musafirbaba.com/${fullSlug}`,
      type: "website",
      images: page.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}
async function AllWebPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = (await params) || [];
  const fullSlug = slug.join("/");

  const page = await getWebPageBySlug(fullSlug);
  const webpageSchema = getWebPageSchema(page.title, page.fullSlug);
  const faqSchema = getFAQSchema(page.faqs ?? []);
  const breadcrumbSchema = getBreadcrumbSchema(page.fullSlug);

  return (
    <>
      <MainWebPage page={page} />
      {page.schemaType?.includes("Webpage") && (
        <Script
          key="webpage-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webpageSchema) }}
        />
      )}
      {page.schemaType?.includes("FAQ") && (
        <Script
          key="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

export default AllWebPage;
