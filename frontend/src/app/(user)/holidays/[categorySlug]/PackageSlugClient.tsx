import React from "react";
import Hero from "@/components/custom/Hero";
import PackageCard from "@/components/custom/PackageCard";
import img1 from "../../../../../public/Hero1.jpg";
import Breadcrumb from "@/components/common/Breadcrumb";

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
export interface Package {
  _id: string;
  title: string;
  slug: string;
  coverImage: CoverImage;
  mainCategory: Category;
  batch: Batch[];
  duration: {
    days: number;
    nights: number;
  };
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
}
interface Category {
  _id: string;
  name: string;
  slug: string;
  coverImage: CoverImage;
  description: string;
}

async function SingleCategoryPage({
  categoryData,
  packagesData,
}: {
  categoryData: Category;
  packagesData: Package[];
}) {
  // const data = await getCategoryBySlug(slug);

  const category = categoryData ?? {};
  const packages = packagesData ?? [];

  return (
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

      {/* Show category details */}
      {/* <div className="max-w-4xl mx-auto flex flex-col items-center text-center my-12">
        <h1 className="text-3xl font-bold">{category?.name}</h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
        <p className="mt-2 text-muted-foreground">{category?.description}</p>
      </div> */}

      {/* Show packages under this category */}
      {packages && packages.length > 0 && (
        <div className="max-w-7xl  mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 px-10">
          {packages.map((pkg) => (
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage?.url ?? "",
                price: pkg?.batch ? pkg?.batch[0]?.quad : 9999,
                duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                destination: pkg.destination?.name ?? "",
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/holidays/${pkg?.mainCategory?.slug}/${pkg.destination.state}/${pkg.slug}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default SingleCategoryPage;
