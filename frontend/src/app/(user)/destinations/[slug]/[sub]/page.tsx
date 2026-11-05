import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import { notFound } from "next/navigation";
import React from "react";
import { CustomizedPackageInterface } from "@/app/(user)/holidays/customised-tour-packages/[destination]/page";
import { getCategory } from "@/app/(user)/holidays/page";
import DestinationPackagesClient, {
  SubDestinationOption,
} from "@/components/custom/DestinationPackagesClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import Script from "next/script";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import ReadMore from "@/components/common/ReadMore";
import PageFaqs from "@/components/common/PageFaqs";

interface SubDestination {
  _id: string;
  name: string;
  description?: string;
  content?: string;
  coverImage?: { url: string; alt?: string };
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  slug: string;
  faqSchema?: { question: string; answer: string }[];
  parent: { _id: string; name: string; slug: string };
}
interface GroupPackage {
  slug: string;
  destination?: { state?: string };
  mainCategory: { slug: string };
  batch?: { quad: number }[];
}

type Params = Promise<{ slug: string; sub: string }>;

const getSubDestination = async (
  slug: string,
  sub: string,
): Promise<SubDestination | null> => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/destination/slug/${slug}/${sub}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
  } catch {
    return null;
  }
};

// Packages tagged with this sub-destination (their URLs stay under the parent)
async function getGroupPackages(subId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?subDestination=${subId}`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data ?? [];
}

async function getCustomizedPackages(subId: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage?subDestination=${subId}&status=published`,
    { next: { revalidate: 60 } },
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data ?? [];
}

// Sibling sub-destinations, listed in the filter sidebar
async function getSiblingSubDestinations(
  parentId: string,
): Promise<SubDestinationOption[]> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/destination?parent=${parentId}&status=published&view=card`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Params }) {
  const { slug, sub } = await params;
  const destination = await getSubDestination(slug, sub);
  const url = `https://musafirbaba.com/destinations/${slug}/${sub}`;
  return {
    title: destination?.metaTitle || destination?.name,
    description: destination?.metaDescription,
    keywords: destination?.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: destination?.metaTitle || destination?.name,
      description: destination?.metaDescription,
      url,
      type: "website",
      images:
        destination?.coverImage?.url ||
        "https://musafirbaba.com/homebanner.webp",
    },
  };
}

async function SubDestinationPage({ params }: { params: Params }) {
  const { slug, sub } = await params;
  const destination = await getSubDestination(slug, sub);
  if (!destination) return notFound();

  const [packages, customizedPkg, categorydata, siblings] = await Promise.all([
    getGroupPackages(destination._id),
    getCustomizedPackages(destination._id),
    getCategory(),
    getSiblingSubDestinations(destination.parent._id),
  ]);
  const newCustomizedPkg = (customizedPkg || []).map(
    (pkg: CustomizedPackageInterface) => ({
      ...pkg,
      price: pkg?.plans?.[0]?.price || 0,
      mainCategory: { slug: "customised-tour-packages" },
    }),
  );
  const newGroupPkg = (packages || []).map((pkg: GroupPackage) => ({
    ...pkg,
    price: pkg?.batch?.[0]?.quad || 0,
  }));
  const categories = categorydata?.data ?? [];
  const totalPackages = [...newGroupPkg, ...newCustomizedPkg];

  const breadcrumbSchema = getBreadcrumbSchema(`destinations/${slug}/${sub}`);
  const collectionSchema = getCollectionSchema(
    "Explore Packages in " + destination.name,
    `https://musafirbaba.com/destinations/${slug}/${sub}`,
    (packages || []).map((pkg: GroupPackage) => ({
      url: `https://musafirbaba.com/holidays/${pkg.mainCategory?.slug}/${pkg.destination?.state ?? slug}/${pkg.slug}`,
    })),
  );

  return (
    <section>
      <Hero
        image={destination.coverImage?.url || "/Hero1.jpg"}
        title={`Explore Packages in ${destination.name}`}
        description={destination.description}
        height="lg"
        align="center"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-5">
        <Breadcrumb />
      </div>
      {destination.content && (
        <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
          <ReadMore content={destination.content} />
        </div>
      )}
      {totalPackages.length === 0 ? (
        <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
          <p className="text-2xl font-semibold text-gray-800 text-center">
            No packages found for this destination
          </p>
        </div>
      ) : (
        <DestinationPackagesClient
          data={totalPackages}
          category={[...categories]}
          subDestinations={siblings}
          parentSlug={slug}
          parentName={destination.parent.name}
          activeSubId={destination._id}
        />
      )}
      <PageFaqs faqs={destination.faqSchema} />
      <Script
        key="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        key="package-collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </section>
  );
}

export default SubDestinationPage;
