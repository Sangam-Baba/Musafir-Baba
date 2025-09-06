"use client";
import React from 'react'
import  Hero  from '@/components/custom/Hero'
import CategoryGrid from '@/components/custom/CategoryGrid'
import img1 from "../../../public/Hero1.jpg";
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader } from '@/components/custom/loader';
import { useParams } from 'next/navigation';
interface Destination{
            seo?: {
                keywords: string[]
            },
            _id: string,
            name: string,
            country: string,
            state: string,
            city?: string,
            description: string,
            coverImage: string,
            gallery?: [],
            popularAttractions?: [],
            thingsToDo?: [],
            slug: string,
}
interface QueryResponse{
    success: boolean;
    data: Destination[],
        total: number,
    page: number,
    totalPages: number
}
const getIndiaDestinations = async (country: string): Promise<QueryResponse> => {
  const res =await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/destination/?country=${country}`,{
    method:"GET",
    headers:{"Content-Type":"appliction/json"},
    credentials:"include"
  })
  if(!res.ok){
    throw new Error("Failed to fetch india destinations")
  }
  return res.json();
}
function IndiaDestination() {
    const {country} = useParams<{ country: string }>();
    const CountryName= country;
const { data, isLoading, isError, error } = useQuery<QueryResponse>({
  queryKey: ["india-destinations"],
  queryFn: ()=>getIndiaDestinations(CountryName),
  retry: 2,
  staleTime: 1000 * 60 * 5
})

if(isLoading){
  return <Loader size="lg" message="Loading india destinations..." />;
}
if(isError){
  toast.error(error.message);
  return <h1>{error.message}</h1>
}

const  destinations   = data?.data ?? [];
  return (
    <section>
        <Hero 
            image={img1.src}
            title="Explore Best Destinations"
            description='Curated itineraries, flexible dates, and best-price guarantees'
            height="lg"
            align="center"
            />
      {destinations.length > 0 ? (
        <div>
          <CategoryGrid 
                categories={
                  destinations.map((destination) => ({
                    id: destination._id,
                    name: destination.name,
                    slug: destination.slug,
                    image: destination.coverImage 
                  }))
                } 
                limit={10} 
                title={`${CountryName}'s Best Destinations`}
                url={`/${country}`}
              />
        </div>
      )
      : (
        <p className="text-center text-gray-600 mt-6">
          No destinations found for {CountryName}.
        </p>
      )}
    </section>
  )
}

export default IndiaDestination