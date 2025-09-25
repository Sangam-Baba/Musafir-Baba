"use client"
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import {Loader} from '@/components/custom/loader'
import ListBlogSidebar from './ListBlogSidebar'

const getTrandingBlogs =  async()=>{
    const res= await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/blogs/tranding`);
    if(!res.ok) throw new Error("Failed to fetch tranding blogs");
    const data=await res.json();
    return data?.data;
}
function TrandingBlogSidebar() {
    const { data: blogs, isLoading, isError } = useQuery({queryKey:["trandingBlogs"], queryFn:getTrandingBlogs});

    if(isLoading) return <Loader size="lg" message="Loading tranding blogs..." />;
    if(isError) return <h1>Failed to fetch trending blogs</h1>;
  return <ListBlogSidebar blogs={blogs} title="Trending Blogs" />
}

export default TrandingBlogSidebar