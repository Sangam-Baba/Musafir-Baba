import { Metadata } from "next";
import { getChildWebPageBySlug } from "@/app/(user)/[webpage]/[slug]/page";
import MainWebPage from "@/components/custom/MainWebpage";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const page = await getChildWebPageBySlug(slug, "bookings");
  // const page = res?.data;
  if (!page)
    return {
      title: "Musafir Baba",
      description: "Musafir Baba",
    };
  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.keywords,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${page.slug}`,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      url: `${process.env.NEXT_PUBLIC_SITE_URL}/bookings/${page.slug}`,
      type: "website",
    },
  };
}
async function BookingsWebPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const page = await getChildWebPageBySlug(slug, "bookings");
  return <MainWebPage page={page} />;
}

export default BookingsWebPage;
