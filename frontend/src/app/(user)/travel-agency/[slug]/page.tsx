import MainWebPage from "@/components/custom/MainWebpage";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWebPageBySlug } from "@/app/(user)/[webpage]/page";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getWebPageBySlug(slug);

  if (!page) return notFound();

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/${page.slug}`,
      type: "website",
    },
  };
}

async function page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <MainWebPage slug={slug} />;
}

export default page;
