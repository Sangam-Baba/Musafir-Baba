import { Metadata } from "next";
import MainWebPage from "@/components/custom/MainWebpage";
import { notFound } from "next/navigation";

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
    },
  };
}
async function AllWebPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = (await params) || [];
  const fullSlug = slug.join("/");
  console.log("fullslug", fullSlug);
  const page = await getWebPageBySlug(fullSlug);

  return <MainWebPage page={page} />;
}

export default AllWebPage;
