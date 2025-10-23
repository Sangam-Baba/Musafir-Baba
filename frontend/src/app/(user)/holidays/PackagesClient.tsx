"use client";

import React from "react";
import Hero from "@/components/custom/Hero";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
import img1 from "../../../../public/Hero1.jpg";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import NotFoundPage from "@/components/common/Not-Found";
interface Category {
  id: string;
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

const getCategory = async (): Promise<CategoryResponse> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};

export default function PackagesClient() {
  const { data, isLoading, isError, error } = useQuery<CategoryResponse>({
    queryKey: ["categories"],
    queryFn: getCategory,
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });

  if (isLoading) {
    return <Loader size="lg" message="Loading categories..." />;
  }

  if (isError) {
    toast.error((error as Error).message);
    return <h1>{(error as Error).message}</h1>;
  }
  if (data?.data.length === 0) return <NotFoundPage />;
  const categories = data?.data ?? [];

  return (
    <section>
      <Hero
        image={img1.src}
        title=""
        align="center"
        height="lg"
        overlayOpacity={0}
      />
      <div className="w-full flex flex-col items-center justify-center mt-8">
        <h1 className="text-3xl md:text-4xl font-bold text-center">Holidays</h1>
        <div className="w-20 h-1 bg-[#FE5300] mt-2"></div>
      </div>
      <div className="max-w-7xl mx-auto py-10 px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
        {categories.map((category, idx) => (
          <Card
            key={idx}
            className={`flex flex-col gap-4 ${
              idx % 2 === 0 ? "bg-[#FFF5E4]" : "bg-[#EBFFF2]"
            } items-center py-4 px-4 hover:scale-105 shadow-md hover:shadow-xl transition duration-500 h-50 `}
          >
            <Link
              href={`/holidays/${category.slug}`}
              className="flex flex-col gap-4 items-center "
            >
              <Image
                src={category.coverImage.url}
                alt={category.name}
                width={50}
                height={50}
              />
              <h1 className="text-xl font-semibold text-center">
                {category.name}
              </h1>
              <p className="text-sm text-center line-clamp-3 px-2">
                {category.description}
              </p>
            </Link>
          </Card>
        ))}
      </div>
    </section>
  );
}
