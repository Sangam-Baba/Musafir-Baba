"use client";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import Hero from "@/components/custom/Hero";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader } from "@/components/custom/loader";
import { VisaTypesDialog } from "@/components/custom/VisaTypesDialog";
interface Visa {
  id: string;
  country: string;
  coverImage?: {
    url: string;
    alt: string;
    width: number;
    height: number;
  };
  cost: number;
  duration: string;
  visaType: string;
  visaProcessed: number;
  slug: string;
}
const getVisa = async (search: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/visa/?country=${search}`
  );
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  console.log(data.data);
  return data?.data; // []
};
function VisaPage() {
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      setLoading(true);
      refetch();
      setSearch("");
    } catch (error) {
      console.log(error);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const {
    data: visa,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ["visa", loading],
    queryFn: () => getVisa(search),
    staleTime: 1000 * 60 * 5,
    retry: 2,
  });
  if (isLoading) return <Loader size="lg" message="Loading visas..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;

  return (
    <section>
      <div className="relative">
        <Hero image="/Heroimg.jpg" title="Visa" />
        <form
          onSubmit={handleSubmit}
          className=" z-10 absolute bottom-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex border border-gray-300 rounded-md overflow-hidden "
        >
          <Input
            className="border-none text-white"
            type="text"
            placeholder="Search for a country"
            value={search}
            onChange={handleChange}
          />
          <Button
            className="border-none bg-[#FF5300] hover:bg-[#FE5300]"
            type="submit"
          >
            Search
          </Button>
        </form>
      </div>

      <div className="container lg:max-w-7xl  mx-auto py-10 px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visa.length === 0 && (
            <h1 className="text-2xl font-bold">No Visas found</h1>
          )}

          {visa.map((visa: Visa) => {
            return (
              <Card
                key={visa.id}
                className=" shadow-lg h-full shadow-gray-500/50 hover:shadow-[#FF5300]/50 "
              >
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <Image
                      src={visa.coverImage?.url ? visa.coverImage.url : ""}
                      alt={visa.coverImage?.alt ? visa.coverImage.alt : ""}
                      width={300}
                      height={200}
                      className="outline rounded-md object-cover w-20 h-15"
                    />
                    <VisaTypesDialog type={visa.visaType} />
                  </div>

                  <CardTitle className="flex items-center text-2xl  gap-2">
                    {visa.country}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 font-semibold">
                    Get your visa in {visa.duration}
                  </p>
                  <p className="text-gray-600 font-semibold">
                    {visa.visaProcessed}+ Visa Processed
                  </p>
                </CardContent>
                <CardFooter className="flex items-center justify-between border-t  ">
                  <p className="font-bold text-md ">
                    <span className="text-[#FF5300]">₹{visa.cost}</span>+
                    Servics Fee
                  </p>
                  <p className="font-bold text-blue-600">
                    <Link href={`/visa/${visa.slug}`}>
                      Apply Now <span className="font-bold">{`>`}</span>
                    </Link>
                  </p>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default VisaPage;
