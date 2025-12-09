import MainWebPage from "@/components/custom/MainWebpage";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChildWebPageBySlug } from "@/app/(user)/[webpage]/[slug]/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getChildWebPageBySlug(slug, "travel-agency");

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/travel-agency/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `https://musafirbaba.com/travel-agency/${page.slug}`,
      type: "website",
    },
  };
}

async function page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getChildWebPageBySlug(slug, "travel-agency");

  if (!page) return notFound();
  return <MainWebPage page={page} />;
}

export default page;
