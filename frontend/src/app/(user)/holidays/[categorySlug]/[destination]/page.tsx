import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import { notFound } from "next/navigation";
import GroupPkgClient from "../PackageSlugClient";
import Script from "next/script";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import ReadMore from "@/components/common/ReadMore";

export interface Duration {
  days: number;
  nights: number;
}
export interface Faqs {
  question: string;
  answer: string;
}
export interface Itinerary {
  title: string;
  description: string;
}

export async function getPackageByDestinationSlug(
  categorySlug: string,
  slug: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${slug}&category=${categorySlug}`,
    {
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}

export async function getDestinationMeta(
  categorySlug: string,
  destinationSlug: string
) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/destinationseo/${categorySlug}/${destinationSlug}`,
    {
      next: { revalidate: 86400 },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ categorySlug: string; destination: string }>;
}) {
  const { categorySlug, destination } = await params;
  const pkgData = await getPackageByDestinationSlug(categorySlug, destination);
  const meta = await getDestinationMeta(categorySlug, destination);
  return {
    title: `${meta?.metaTitle || pkgData[0]?.destination?.name}`,
    description: meta?.metaDescription || pkgData[0]?.destination?.description,
    keywords: meta?.keywords || pkgData[0]?.destination?.keywords,
    alternates: {
      canonical: `https://musafirbaba.com/holidays/${categorySlug}/${destination}`,
    },
    openGraph: {
      title: meta?.metaTitle || pkgData[0]?.destination?.name,
      description:
        meta?.metaDescription || pkgData[0]?.destination?.description,
      url: `https://musafirbaba.com/holidays/${categorySlug}/${destination}`,
      type: "website",
      images:
        meta?.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}
async function DestinationPage({
  params,
}: {
  params: Promise<{ categorySlug: string; destination: string }>;
}) {
  const { categorySlug, destination } = await params;
  const packages = await getPackageByDestinationSlug(categorySlug, destination);
  if (!packages || packages.length === 0) return notFound();
  const meta = await getDestinationMeta(categorySlug, destination);

  const breadcrumbSchema = getBreadcrumbSchema(
    "holidays/" + categorySlug + "/" + destination
  );
  const collectionSchema = getCollectionSchema(
    "Travel Packages for " + packages[0]?.destination?.name,
    "https://musafirbaba.com/holidays/" + categorySlug + "/" + destination,
    packages.map((pkg: { slug: string }) => ({
      url: `https://musafirbaba.com/holidays/${categorySlug}/${destination}/${pkg.slug}`,
    }))
  );
  return (
    <section>
      <Hero
        image={packages[0]?.destination?.coverImage?.url || "/Hero1.jpg"}
        title={`Explore Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`}
        description={meta?.excerpt}
        height="lg"
        align="center"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-5">
        <Breadcrumb />
      </div>

      {/* SHow description */}
      {meta?.content && (
        <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
          <ReadMore content={meta?.content} />
        </div>
      )}

      {/* Show packages under this category */}
      <GroupPkgClient packagesData={packages} />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* {meta.schemaType.includes("Collection") && ( */}
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      {/* )} */}
    </section>
  );
}

export default DestinationPage;
