import { Metadata } from "next";
import GroupPkgClient from "./PackageSlugClient";
import Script from "next/script";
import { notFound } from "next/navigation";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import img1 from "../../../../../public/Hero1.jpg";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";

interface Props {
  params: Promise<{ categorySlug: string }>;
}
interface Batch {
  _id: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface Itinerary {
  day: number;
  title: string;
  description: string;
}
interface Package {
  _id: string;
  description: string;
  title: string;
  metaDescription: string;
  slug: string;
  coverImage: CoverImage;
  batch: Batch[];
  duration: {
    days: number;
    nights: number;
  };
  itinerary: Itinerary[];
  destination: Destination;
  isFeatured: boolean;
  status: "draft" | "published";
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
  city: string;
}
export async function getCategoryBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/category/${slug}`,
    {
      cache: "no-cache",
    }
  );
  if (res.status === 404) {
    return notFound();
  }
  if (!res.ok) {
    throw new Error("Failed to fetch category");
  }
  return res.json();
}
export async function getPackageByCategorySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/category/${slug}`,
    {
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categorySlug } = await params;
  try {
    const res = await getCategoryBySlug(categorySlug);
    const { category } = res?.data ?? {};

    if (!category) {
      return {
        title: "Category Not Found | Musafir Baba",
        description: "This travel category does not exist.",
      };
    }

    const title = `${category?.metaTitle || category?.name} | Musafir Baba`;
    const description = `${category?.metaDescription || category?.description}`;

    return {
      title,
      description,
      keywords: category?.keywords,
      alternates: {
        canonical: `https://musafirbaba.com/holidays/${categorySlug}`,
      },
      openGraph: {
        title,
        description,
        url: `https://musafirbaba.com/holidays/${categorySlug}`,
        images: [
          {
            url: category?.coverImage.url || "https://musafirbaba.com/logo.svg",
            width: 1200,
            height: 630,
            alt: category.name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [
          category?.coverImage.url || "https://musafirbaba.com/logo.svg",
        ],
      },
    };
  } catch {
    return {
      title: "Error | Musafir Baba",
      description: "Failed to fetch category.",
    };
  }
}
export default async function Page({
  params,
}: {
  params: Promise<{ categorySlug: string }>;
}) {
  const { categorySlug } = await params;
  const res = await getCategoryBySlug(categorySlug);
  const { category } = res?.data;
  const packages = await getPackageByCategorySlug(categorySlug);
  if (!category) return notFound();
  // const packages = category?.packages ?? [];

  // ✅ Build JSON-LD Schema

  const breadcrumbSchema = getBreadcrumbSchema("holidays/" + categorySlug);
  const collectionSchema = getCollectionSchema(
    "Travel Packages for " + category?.name,
    "https://musafirbaba.com/holidays/" + categorySlug,
    packages.map((pkg: Package) => ({
      url: `https://musafirbaba.com/holidays/${categorySlug}/${pkg?.destination?.state}/${pkg.slug}`,
    }))
  );
  return (
    <>
      <section className="w-full mb-12">
        <Hero
          image={packages[0]?.coverImage?.url || img1.src}
          title={category?.name}
          description={category?.description}
          align="center"
          height="lg"
          overlayOpacity={100}
        />
        <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
          <Breadcrumb />
        </div>
      </section>
      <GroupPkgClient packagesData={packages} />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {/* {category?.schemaType.includes("Collection") && ( */}
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
      {/* )} */}
    </>
  );
}
