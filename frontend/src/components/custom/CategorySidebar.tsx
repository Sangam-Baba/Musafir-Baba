"use client";
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader } from "@/components/custom/loader";
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
const getCategory = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`);
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }
  return res.json();
};
function CategorySidebar() {
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
  const Categories = data?.data ?? [];
  return (
    <div>
      <Card className=" ">
        <CardHeader>
          <CardTitle className="flex flex-col text-xl font-bold ">
            Categories
            <p className="w-[8%] h-1 rounded-md bg-[#FE5300]"></p>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-4">
            {Categories.map((cat: Category, idx: number) => (
              <li key={idx} className="flex justify-between p-1 md:px-3 ">
                <Link
                  href={`/blog?category=${cat.slug}`}
                  className="text-sm text-gray-800 hover:text-[#FE5300]"
                >
                  <span className="mr-2 text-[#FE5300] font-bold">{`>`}</span>
                  {cat.name}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

export default CategorySidebar;
