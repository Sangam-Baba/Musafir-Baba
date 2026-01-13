import { Metadata } from "next";
import MainWebPage from "@/components/custom/MainWebpage";
import { notFound } from "next/navigation";
import { getWebPageSchema } from "@/lib/schema/webpage.schema";
import Script from "next/script";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { revalidate } from "../auth/logout/page";

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
      canonical: page?.canonicalUrl
        ? `https://musafirbaba.com${page.canonicalUrl}`
        : `https://musafirbaba.com/${fullSlug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: page?.canonicalUrl
        ? `https://musafirbaba.com${page.canonicalUrl}`
        : `https://musafirbaba.com/${fullSlug}`,
      type: "website",
      images: page.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}

export async function getRelatedWebpageBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/related/${slug}`,
    {
      next: { revalidate: 120 },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}

export async function getTrandingPkg(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/related-packages/${slug}`,
    {
      next: { revalidate: 120 },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.data;
}
async function AllWebPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = (await params) || [];
  // console.log("this is SLug ", slug);
  const fullSlug = slug.join("/");

  const page = await getWebPageBySlug(fullSlug);
  const relatedPage = await getRelatedWebpageBySlug(slug[slug.length - 1]);
  const trandingPkg = await getTrandingPkg(slug[0]);
  console.log("best saller", trandingPkg);
  const webpageSchema = getWebPageSchema(page.title, page.fullSlug);
  const faqSchema = getFAQSchema(page.faqs ?? []);
  const breadcrumbSchema = getBreadcrumbSchema(page.fullSlug);
  console.log("this is realetd page", relatedPage);
  return (
    <>
      <MainWebPage page={page} relatedPage={relatedPage} pkg={trandingPkg} />
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
