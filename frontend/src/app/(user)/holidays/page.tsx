import MixedPackagesClient from "./PackagesClient";
import { Metadata } from "next";
import Script from "next/script";
import { getAllCustomizedPackages } from "./customised-tour-packages/page";
import { Package } from "./[categorySlug]/PackageSlugClient";
import { CustomizedPackageInterface } from "./customised-tour-packages/[destination]/page";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";

export interface Category {
  _id: string;
  name: string;
  slug: string;
  coverImage: {
    url: string;
    alt: string;
  };
  description: string;
}

interface CategoryResponse {
  data: Category[];
}

export const metadata: Metadata = {
  title:
    "Affordable Holiday Tour Packages - Domestic & International | Book Now",
  description:
    "Explore incredible tour package without breaking the bank. Our affordable tour packages cover domestic and international trips. Easy booking and 24/7 support included.",
  alternates: {
    canonical: "https://musafirbaba.com/holidays",
  },
};

export const getCategory = async (): Promise<CategoryResponse> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};
const getPackages = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};
export default async function PackagesPage() {
  const data = await getPackages();
  const customizedPkgs = await getAllCustomizedPackages();
  const categorydata = await getCategory();
  const categories = categorydata?.data ?? [];

  const totalCategory = [...categories];

  const finalCustomizedPkgs = customizedPkgs.map(
    (pkg: CustomizedPackageInterface) => ({
      ...pkg,
      mainCategory: { slug: "customised-tour-packages" },
      price: pkg.plans[0].price,
    })
  );
  const finalGroupPkgs = data?.data.map((pkg: Package) => ({
    ...pkg,
    price: pkg.batch[0].quad,
  }));
  const totalPkgs = [...finalCustomizedPkgs, ...finalGroupPkgs];

  const breadcrumbSchema = getBreadcrumbSchema("holidays");
  const collectionSchema = getCollectionSchema(
    "Holidays",
    "https://musafirbaba.com/holidays",
    totalPkgs.map((pkg: Package) => ({
      url: `https://musafirbaba.com/holidays/${pkg.mainCategory?.slug}/${pkg?.destination?.state}/${pkg.slug}`,
    }))
  );
  return (
    <div>
      <Hero
        image="https://res.cloudinary.com/dmmsemrty/image/upload/v1761815676/tour_package_k5ijnt.webp"
        title="Holidays"
        align="center"
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <MixedPackagesClient data={totalPkgs} category={totalCategory} />
      {/* JSON-LD Schema */}
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
    </div>
  );
}
