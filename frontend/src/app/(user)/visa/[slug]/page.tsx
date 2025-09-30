"use client";
import Hero from '@/components/custom/Hero'
import React from 'react'
import { useQuery } from '@tanstack/react-query';
import QueryForm from '@/components/custom/QueryForm';
import { BlogContent } from '@/components/custom/BlogContent';
import { useParams } from 'next/navigation';
import {Loader} from '@/components/custom/loader';
const getWebPageBySlug = async (slug: string) => {
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/${slug}`);
    if(!res.ok) throw new Error("Failed to fetch visas");
    const data=await res.json();
    return data?.data;
}
function VisaWebPage() {
    const slug=useParams().slug as string;

    const { data:visa, isLoading, isError, error } = useQuery({queryKey:["visa", slug], queryFn:()=>getWebPageBySlug(slug)});
    if(isLoading) return <Loader size="lg" message="Loading visas..." />;
    if(isError) return <h1>{(error as Error).message}</h1>;
  return (
    <section className="flex flex-col items-center">
        <Hero image="/Heroimg.jpg" title="Visa" />
     <div className="max-w-7xl flex md:flex-row flex-col px-4 sm:px-6 lg:px-8 ">
        
        <article className=" mx-auto px-4 sm:px-6 lg:px-8">

      <header className="mt-6 space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mt-2">
          {visa.keywords.map((tag: string) => (
            <span
              key={tag}
              className="bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>
      </header>
      <section className="prose prose-lg max-w-none mt-6">
        <BlogContent html={visa.content} />
      </section>
      <section>

      </section>
        </article>
       <div className=" w-[30%] py-10">
          <QueryForm />
      
       </div>
           
    </div>
           {/* ✅ JSON-LD Schema
      <Script id="blog-schema" type="application/ld+json">
        {JSON.stringify(schema)}
      </Script> */}
    </section>
  )
}

export default VisaWebPage