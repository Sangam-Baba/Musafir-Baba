import MainWebPage from "@/components/custom/MainWebpage";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export const getWebPageBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/webpage/${slug}`,
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
  params: Promise<{ webpage: string; slug: string }>;
}): Promise<Metadata> {
  const { webpage, slug } = await params;
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

async function page({
  params,
}: {
  params: Promise<{ webpage: string; slug: string }>;
}) {
  const { webpage, slug } = await params;
  return <MainWebPage slug={slug} />;
}

export default page;
