import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import { notFound } from "next/navigation";
import CustomizedTourClient from "../CustomizedTourClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import Script from "next/script";
import { getDestinationMeta } from "../../[categorySlug]/[destination]/page";
import ReadMore from "@/components/common/ReadMore";

interface Plan {
  title: string;
  include: string;
  price: number;
}

interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
export interface CustomizedPackageInterface {
  _id: string;
  title: string;
  slug: string;
  coverImage: CoverImage;
  plans: Plan[];
  duration: {
    days: number;
    nights: number;
  };
  destination: Destination;
  status: "draft" | "published";
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
}
export async function getPackageByDestinationSlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage?destination=${slug}`,
    {
      next: { revalidate: 60 },
    }
  );
  if (res.status === 404) return notFound();
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data;
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ destination: string }>;
}) {
  const { destination } = await params;
  const meta = await getDestinationMeta(
    "customised-tour-packages",
    destination
  );
  return {
    title: meta?.metaTitle || `Customised Packages in ${destination}`,
    description:
      meta?.metaDescription ||
      `Customised Packages in ${
        destination.charAt(0).toUpperCase() + destination.slice(1)
      }`,
    alternates: {
      canonical: `https://musafirbaba.com/holidays/customised-tour-packages/${destination}`,
    },
    keywords: meta?.keywords,
    openGraph: {
      title:
        meta?.metaTitle ||
        `MusafirBaba | Customised Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`,
      description:
        meta?.metaDescription ||
        `Customised Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`,
      url: `https://musafirbaba.com/holidays/customised-tour-packages/${destination}`,
      type: "website",
      images:
        meta?.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
    },
  };
}
async function DestinationPage({
  params,
}: {
  params: { destination: string };
}) {
  const { destination } = await params;
  const packages = await getPackageByDestinationSlug(destination);
  const meta = await getDestinationMeta(
    "customised-tour-packages",
    destination
  );
  if (!packages || packages.length === 0) return notFound();

  const breadcrumbSchema = getBreadcrumbSchema(
    "customised-tour-packages/" + destination
  );
  const collectionSchema = getCollectionSchema(
    "Explore Customised Packages in " + destination,
    "https://musafirbaba.com/holidays/customised-tour-packages/" + destination,
    packages.map((pkg: CustomizedPackageInterface) => ({
      url: `https://musafirbaba.com/holidays/customised-tour-packages/${destination}/${pkg.slug}`,
    }))
  );
  return (
    <section>
      <Hero
        image={packages[0]?.coverImage?.url}
        title={`Explore Customised Packages in ${
          destination.charAt(0).toUpperCase() + destination.slice(1)
        }`}
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
      <CustomizedTourClient allPkgs={packages} />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </section>
  );
}

export default DestinationPage;
