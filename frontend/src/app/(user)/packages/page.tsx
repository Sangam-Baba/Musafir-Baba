"use client";
import React from 'react'
import Hero from '../../../components/custom/Hero';
import CategoryGrid from '../../../components/custom/CategoryGrid';
import { useQuery } from "@tanstack/react-query";
import { toast } from 'sonner';
import { Loader } from "@/components/custom/loader";
import img1 from "../../../../public/Hero1.jpg";


interface Category {
    id: string;
    name: string;
    slug: string;
    image: string;
    description: string;
}

interface CategoryResponse{
    data: Category[]
}
const getCategory = async():Promise<CategoryResponse>=>{
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`
        ,{
            method: 'GET',
            headers:{
                "Content-Type": "application/json"
            },
            credentials: "include",
        });
    if (!res.ok) throw new Error("Failed to fetch posts");
    return res.json()
}

function Packages() {
    const {data , isLoading, isError, error} = useQuery<CategoryResponse>({queryKey:["categories"], queryFn:getCategory,
        staleTime: 1000 * 60 * 5,
        retry: 2,
    });
   
    if(isLoading) {
        return <Loader size="lg" message="Loading categories..." />;
    }
    if(isError) {
        toast.error(error.message);
        return <h1>{error.message}</h1>
    }
    const categories = data?.data ?? [];
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
      <div>
               <CategoryGrid 
                categories={categories} 
                limit={10} 
                title="Find Your Perfect Getaway with the Best Travel Agency in Delhi" 
                url="/packages"
              />
      </div>
    </section>
  )
}

export default Packages