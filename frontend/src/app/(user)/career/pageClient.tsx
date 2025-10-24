"use client";
import Hero from "@/components/custom/Hero";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BlogContent } from "@/components/custom/BlogContent";
import { Loader } from "@/components/custom/loader";
import { Card } from "@/components/ui/card";
import Image from "next/image";
import ApplicationForm from "@/components/custom/ApplicationForm";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Breadcrumb from "@/components/common/Breadcrumb";

interface Job {
  _id: string;
  title: string;
  experienceLevel: string;
  salaryRange: string;
  employmentType: string;
  isActive: boolean;
  location: string;
  jobType: string;
  department: string;
  requirements: { name: string }[];

  responsibilities: { name: string }[];
}
const getWebPageBySlug = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/webpage/career`);
  if (!res.ok) throw new Error("Failed to fetch career");
  const data = await res.json();
  return data?.data;
};

const img = [
  {
    url: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760079570/pexels-divinetechygirl-1181533_cwxb50.jpg",
    alt: "Musafirbaba Career",
  },
  {
    url: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760079553/pexels-olly-3760072_fylajk.jpg",
    alt: "Musafirbaba Career",
  },
  {
    url: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760079549/pexels-luis-sevilla-252657-34221054_b2jnbz.jpg",
    alt: "Musafirbaba Career",
  },
  {
    url: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760079549/pexels-olly-3756679_h03wqu.jpg",
    alt: "Musafirbaba Career",
  },
  {
    url: "https://res.cloudinary.com/dmmsemrty/image/upload/v1760165609/pexels-cottonbro-4065137_no5f8g.jpg",
    alt: "Musafirbaba Career",
  },
];
const getAllJobs = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/job`);
  if (!res.ok) throw new Error("Failed to fetch jobs");
  const data = await res.json();
  return data;
};
function CareerClientPage() {
  const slug = "contact-us";

  const {
    data: visa,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["visa", slug],
    queryFn: getWebPageBySlug,
  });

  const { data } = useQuery({
    queryKey: ["jobs"],
    queryFn: getAllJobs,
  });

  const jobs = data?.data ?? [];
  if (isLoading) return <Loader size="lg" message="Loading Career..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;
  return (
    <section className="">
      <Hero image={visa?.coverImage?.url || "/Hero1.jpg"} title="Career" />
      <div className="w-full  mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className=" mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-5 items-center">
        <article className="w-full  flex flex-col items-center">
          <div className="prose prose-lg max-w-none  text-center">
            <BlogContent html={visa.content} />
          </div>

          <div className="grid grid-cols-1  md:grid-cols-5 gap-4 mt-20">
            {img.map((visa, index) => (
              <div
                key={visa.url}
                className={`overflow-hidden rounded-2xl ${
                  index % 2 === 0 ? "self-start" : "self-end"
                }`}
              >
                <Image
                  src={visa.url}
                  alt={visa.alt}
                  width={500}
                  height={500}
                  className="w-full h-[200px] md:h-auto rounded-2xl object-cover shadow-md hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>

          {/* {Job Listing} */}
          <div className="w-full mt-20 items-center flex flex-col">
            <h2 className="text-2xl font-bold mt-8 mb-4">Job Openings</h2>
            <p>
              Be part of a fast-growing travel brand. Explore exciting roles and
              build a career that takes you places.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((job: Job) => (
                <Card
                  key={job._id}
                  className="flex flex-row justify-between mt-8 shadow hover:shadow-lg transition duration-500 p-4 "
                >
                  <div>
                    <h3 className="font-bold text-xl">{job.title}</h3>
                    <p className="text-md text-gray-600 font-semibold">
                      {job.department} / {job.location} / {job.experienceLevel}{" "}
                      / {job.employmentType}
                    </p>
                  </div>
                  <Link href={"#form"}>
                    {" "}
                    <Button className="mt-4 bg-[#FE5000] hover:bg-[#CDFFC9] hover:text-[#FE5000]">
                      Apply Now
                    </Button>{" "}
                  </Link>
                </Card>
              ))}
            </div>
          </div>
          <div
            id="form"
            className="mt-20 w-full flex flex-col  gap-4 items-center"
          >
            <ApplicationForm />
          </div>
        </article>
      </div>
    </section>
  );
}

export default CareerClientPage;
