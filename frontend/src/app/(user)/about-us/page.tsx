"use client";
import Hero from "@/components/custom/Hero";
import React from "react";
import { useQuery } from "@tanstack/react-query";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import { Loader } from "@/components/custom/loader";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";
import BlogsHome from "@/components/custom/BlogsHome";
import { Testimonial } from "@/components/custom/Testimonial";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

interface Image {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}

interface Content {
  title: string;
  description: string;
  image: Image;
}

interface FormValues {
  _id: string;
  title: string;
  description: string;
  upperImage: Image[];
  lowerImage: Image[];
  coverImage: Image;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h2title: string;
  h2description: string;
  h2content: Content[];
}
const getWebPageBySlug = async () => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/aboutus/68e8f5bee2f305d5077f7a99`
  );
  if (!res.ok) throw new Error("Failed to fetch about");
  const data = await res.json();
  console.log("About us data", data);
  return data;
};
function AboutUsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["about"],
    queryFn: getWebPageBySlug,
  });
  if (isLoading) return <Loader size="lg" message="Loading About Us..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;
  const about = data?.data || {};
  return (
    <section className="">
      <Hero image={about?.coverImage?.url || "/Hero1.jpg"} title="About Us" />
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <div>
          <div>
            <Carousel className="w-full ">
              <CarouselContent>
                {about?.lowerImage.map((item: Image, index: number) => (
                  <CarouselItem key={index}>
                    <div className="p-1">
                      <Card>
                        <CardContent className="flex items-center justify-center p-6">
                          <Image
                            src={item.url}
                            alt={item.alt}
                            width={500}
                            height={300}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious />
              <CarouselNext />
            </Carousel>
          </div>
        </div>
        {/* <article className="w-full  flex flex-col items-center">
          <header className="mt-6 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">{visa.title}</h1>
          </header>
          <div className="flex ietms-center">
            <section className="prose prose-lg max-w-none mt-6 text-center">
              <BlogContent html={visa.content} />
            </section>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 ">
            <Card className="mt-8 bg-[#CDFFC9] shadow hover:shadow-lg transition duration-500 ">
              <CardContent className="flex  flex-col items-center gap-4">
                <MapPin className=" h-10 w-10" color="#FF5733" />
                <p className="font-bold text-2xl text-center">Our Location</p>
                <p className="text-center">
                  1st Floor, Khaira More, Metro Station, Plot no. 2 & 3, near
                  Main Gopal Nagar Road, Prem Nagar, Najafgarh, New Delhi,
                  Delhi, 110043
                </p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#FE5000] shadow hover:shadow-lg transition duration-500 ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Phone className=" h-10 w-10" color="#CDFFC9" />
                <p className="font-bold text-2xl text-center text-white">
                  Phone
                </p>
                <p className="text-center text-white">Tour: +91 92896 02447 </p>
                <p className="text-center text-white">Visa: +91 93556 63591</p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#CDFFC9] shadow hover:shadow-lg transition duration-500  ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Mail className=" h-10 w-10" color="#FF5733" />
                <p className="font-bold text-2xl text-center">Email</p>
                <p className="text-center">care@musafirbaba.com</p>
              </CardContent>
            </Card>
            <Card className="mt-8 bg-[#FE5000] shadow hover:shadow-lg transition duration-500 ">
              <CardContent className="flex  flex-col items-center gap-4">
                <Clock className=" h-10 w-10" color="#CDFFC9" />
                <p className="font-bold text-2xl text-center text-white">
                  Working Hours
                </p>
                <p className="text-center text-white">
                  Mon-Sat : 9:00 AM to 6:00 PM <br />
                  Sun : Closed
                </p>
              </CardContent>
            </Card>
          </div>
          <div className="mt-20 w-full flex flex-col md:flex-row gap-4">
            <Image
              className="object-cover w-full md:w-1/2 h-full  rounded-xl"
              src="https://res.cloudinary.com/dmmsemrty/image/upload/v1760004946/5561899_21273_u8g7cq.jpg"
              width={500}
              height={510}
              alt="Musafirbaba Contact Us"
            />
            <div className="w-full md:w-1/2">
              <QueryForm />
            </div>
          </div>
        </article> */}
      </div>
      <Testimonial />
      <BlogsHome />
      {/* ✅ JSON-LD Schema
      <Script id="blog-schema" type="application/ld+json">
        {JSON.stringify(schema)}
      </Script> */}
    </section>
  );
}

export default AboutUsPage;
