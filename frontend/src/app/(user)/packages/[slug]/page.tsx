"use client";
import React from 'react'
import Hero from '@/components/custom/Hero';
import { useParams } from 'next/navigation';
import { useQuery } from "@tanstack/react-query";
import { toast } from 'sonner';
import { Loader } from "@/components/custom/loader";
import PackageCard from "@/components/custom/PackageCard";
import img1 from "../../../../../public/Hero1.jpg";

interface Package {
  _id: string;
  title: string;
  slug: string;
  coverImage: string;
  price: {
    adult: number;
    child: number;
    currency: string;
  };
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
  image: string;
  description: string;
}
interface CategoryResponse {
  success: boolean;
  data: {
    category: Category;
    packages: Package[];
  };
}

const getCategoryBySlug =async (slug: string): Promise<CategoryResponse>=>{
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category/${slug}`,{
      method:"GET",
      headers:{ "content-type": "application/json"},
      credentials:"include",
      cache:"no-cache",
    });
    if(!res.ok){
        throw new Error("Failed to fetch category");
    }
    return res.json();
}

function SingleCategoryPage() {
    const {slug} = useParams();

const { data, isLoading, isError, error } = useQuery({
  queryKey: ["category", slug],
  queryFn: ()=> getCategoryBySlug(slug as string),
  retry: 2,
})

if(isLoading){
  return <Loader size="lg" message="Loading category..." />;
}
if(isError){
  toast.error(error.message);
  return <h1>{error.message}</h1>
}

 const { category, packages } = data?.data ?? {};
  return (
 <section>
      <Hero
      image={img1.src}
      title="Find Your Perfect Getaway"
      description="Curated itineraries, flexible dates, and best-price guarantees."
      align="center"
      height="lg"
      overlayOpacity={55}
      />
      
      {/* Show category details */}
      <div className="max-w-4xl mx-auto text-center my-12">
        <h1 className="text-3xl font-bold">{category?.name}</h1>
        <p className="mt-2 text-muted-foreground">{category?.description}</p>
      </div>

      {/* Show packages under this category */}
      {packages && packages.length > 0 && (
        <div className="max-w-7xl mx-auto grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {packages.map((pkg) => (
          <PackageCard key={pkg._id} pkg={{
            id: pkg._id,
            name: pkg.title,
            slug: pkg.slug,
            image: pkg.coverImage,
            price: pkg.price.adult,
            duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
            destination: pkg.destination?.name ?? "",
          }} url={`/${pkg.destination.country}/${pkg.destination.state}/${pkg.slug}`} />
           ))}
        </div>
      )}
    </section>
  )
}

export default SingleCategoryPage