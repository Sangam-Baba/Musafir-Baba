"use client";
import React from 'react'
import  Hero  from '@/components/custom/Hero'
import img1 from "../../../../public/Hero1.jpg";
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader } from '@/components/custom/loader';
import { useParams} from 'next/navigation';
import PackageCard from '@/components/custom/PackageCard';

interface Destination{
            _id: string,
            name: string,
            country: string,
            state: string,
            city?: string,
            description: string,
            coverImage: string,
            slug: string,
}
interface Price{
            adult: number;
            child: number;
            currency: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
}
export interface SEO {
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
}
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
interface Package{
  _id: string;
  title: string;
  description: string;
  destination: Destination;
  coverImage: string ;
  gallery: string[];
  price: Price;
  category: Category[];
  duration: Duration;
  seo: SEO;
  keywords: string[];
  startDates: string[];  // ISO date strings
  endDates: string[];    // ISO date strings
  maxPeople?: number;
  highlights: string[];
  inclusions: string[];
  exclusions: string[];
  itinerary: Itinerary[];
  faqs: Faqs[];
  isFeatured: boolean;
  status: "draft" | "published";
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
  slug: string;
  __v: number;
}
interface QueryResponse{
    success: boolean;
    data: Package[],
    total: number,
    page: number,
    totalPages: number
}
const getStatePackages = async (state: string): Promise<QueryResponse> => {
  const res =await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${state}`,{
    method:"GET",
    headers:{"Content-Type":"appliction/json"},
    credentials:"include"
  })
  if(!res.ok){
    throw new Error("Failed to fetch Satate Packages")
  }
  return res.json();
}
function StatePackages() {
    const {state , country} = useParams<{ state: string , country: string}>();
    const StateName= state;
const { data, isLoading, isError, error } = useQuery<QueryResponse>({
  queryKey: ["state-packages"],
  queryFn: ()=>getStatePackages(StateName),
  retry: 2,
  staleTime: 1000 * 60 * 5
})

if(isLoading){
  return <Loader size="lg" message="Loading packages..." />;
}
if(isError){
  toast.error(`No destinations found for ${StateName}`);
  return (<p className="text-center text-gray-600 mt-6">
          No destinations found for {StateName}.
        </p>)
}

const  packages   = data?.data ?? [];
  return (
    <section>
        <Hero 
            image={img1.src}
            title="Explore Best Destinations"
            description='Curated itineraries, flexible dates, and best-price guarantees'
            height="lg"
            align="center"
            />
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
                  destination: pkg.destination.state ?? "",
                }}  url={`/${country}/${state}/${pkg.slug}`} />
                 ))}
              </div>
            )}
    </section>
  )
}

export default StatePackages