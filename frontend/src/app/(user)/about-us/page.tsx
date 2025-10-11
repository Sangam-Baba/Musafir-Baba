"use client";
import Hero from "@/components/custom/Hero";
import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "@/components/custom/loader";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
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
import Autoplay from "embla-carousel-autoplay";
import { Button } from "@/components/ui/button";
import PopupQueryForm from "@/components/custom/PopupQueryForm";

interface ImageType {
  url: string;
  alt: string;
  public_id?: string;
  width?: number;
  height?: number;
}

interface Content {
  title: string;
  description: string;
  image: ImageType;
}

interface FormValues {
  _id: string;
  title: string;
  description: string;
  upperImage: ImageType[];
  lowerImage: ImageType[];
  coverImage: ImageType;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  h2title: string;
  h2description: string;
  h2content: Content[];
}

// Fetch Function
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
  const [cornerImages, setCornerImages] = useState<ImageType[]>([]);
  const [centerImage, setCenterImage] = useState<ImageType>({
    url: "",
    alt: "",
  });
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["about"],
    queryFn: getWebPageBySlug,
  });
  const about = data?.data || {};
  useEffect(() => {
    if (!about?.upperImage?.length) return;

    const updateImages = () => {
      const upperImages = [...about.upperImage];
      const shuffled = upperImages.sort(() => Math.random() - 0.5);
      setCornerImages(shuffled.slice(0, 4));
      setCenterImage(shuffled[4] || upperImages[0]);
    };

    updateImages();

    const interval = setInterval(updateImages, 10000);

    // Cleanup on unmount
    return () => clearInterval(interval);
  }, [about?.upperImage]);
  if (isLoading) return <Loader size="lg" message="Loading About Us..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;

  const floatAnimation = {
    y: [0, -10, 0],
    rotate: [0, 3, -3, 0],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: [0.42, 0, 0.58, 1],
    },
  };

  return (
    <section>
      <Hero image={about?.coverImage?.url || "/Hero1.jpg"} title="About Us" />

      <div className="max-w-7xl mx-auto flex flex-col gap-8 px-4 sm:px-6 lg:px-8 py-10">
        {/* About Section */}
        <div className="flex flex-col md:flex-row gap-16">
          {/* Left Text Section */}
          <div className="w-full md:w-1/2 flex flex-col gap-10">
            <h1 className="text-5xl font-bold mb-4">{about?.title}</h1>
            <p className="text-gray-600 font-semibold text-justify">
              {about?.description}
            </p>
          </div>

          <div className="w-full md:w-1/2 hidden md:block flex m-10 relative rounded-2xl  ">
            {[
              { pos: "-top-10 -left-10", img: cornerImages[0] },
              { pos: "-top-10 -right-10", img: cornerImages[1] },
              { pos: "-bottom-10 -left-10", img: cornerImages[2] },
              { pos: "-bottom-10 -right-10", img: cornerImages[3] },
            ].map(
              (item, index) =>
                item.img && (
                  <motion.div
                    key={index}
                    className={`absolute ${item.pos}`}
                    animate={floatAnimation}
                  >
                    <Image
                      src={item.img.url}
                      alt={item.img.alt}
                      width={150}
                      height={100}
                      className="rounded-xl w-40 h-25 shadow-md"
                    />
                  </motion.div>
                )
            )}

            {/* Center Image */}
            {about?.upperImage?.[1] && (
              <div className="aspect-[3/2] overflow-hidden rounded-xl items-center">
                <Image
                  src={centerImage?.url}
                  alt={centerImage?.alt}
                  width={600}
                  height={400}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <Carousel
            className="w-full max-w-7xl p-0 m-0"
            opts={{ loop: true }}
            plugins={[Autoplay({ delay: 4000, stopOnFocusIn: true })]}
          >
            <CarouselContent>
              {about?.lowerImage?.map((item: ImageType, index: number) => (
                <CarouselItem key={index}>
                  <div className="p-1">
                    <Card className="w-full p-0 border-0 shadow-none">
                      <CardContent className="flex items-center justify-center p-6 relative">
                        <CarouselPrevious className="absolute left-0 z-10" />
                        <motion.div
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          transition={{
                            duration: 4,
                            ease: [0.42, 0, 0.58, 1],
                          }}
                          className="w-full h-[300px] md:h-[600px] overflow-hidden rounded-xl"
                        >
                          <Image
                            src={item.url}
                            alt={item.alt}
                            width={1200}
                            height={800}
                            className="w-full h-full object-cover"
                          />
                        </motion.div>
                        <CarouselNext className="absolute right-0 z-10" />
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
      <div className="max-w-7xl mx-auto flex flex-col gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <div className="w-full  flex flex-col md:flex-row gap-10 justify-around">
          <h1 className="w-full md:w-2/5 text-5xl font-bold mb-4">
            {about?.h2title}
          </h1>
          <p className="w-full md:w-3/5  text-gray-600 font-semibold text-justify">
            {about?.h2description}
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3  gap-4">
          {about?.h2content?.map((item: Content, idx: number) => (
            <Card key={idx} className="w-full p-0 m-0 border-0 shadow-none">
              <CardContent>
                <Image
                  src={item?.image?.url}
                  alt={item?.image?.alt}
                  width={80}
                  height={80}
                />
                <h3 className="text-2xl font-semibold text-justify">
                  {item?.title}
                </h3>
                <p className="text-gray-600 font-semibold text-justify">
                  {item?.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="w-full lg:h-[250px] flex flex-col lg:flex-row mt-15">
          <div className="w-full lg:w-1/5">
            <Image
              src={about?.lowerImage[0]?.url}
              alt={about?.lowerImage[0]?.alt}
              width={1024}
              height={200}
              className="w-full h-[250px] lg:h-full z-10 object-cover"
            />
          </div>
          <div
            className="relative flex flex-col lg:flex-row justify-between items-center text-white p-8  w-full lg:w-4/5 overflow-hidden"
            style={{
              backgroundImage: `url(${about?.coverImage?.url})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            {/* Dark overlay */}
            <div className="absolute inset-0 bg-black/70"></div>

            {/* Text Content */}
            <div className="relative z-10  lg:text-left space-y-2">
              <h3 className="text-xl font-bold">Exclusive travel deals</h3>
              <p className="text-4xl font-bold">
                Book your dream vacation today!
              </p>
            </div>

            {/* Button */}
            <div className="relative z-10 mt-4 lg:mt-0">
              <PopupQueryForm />
            </div>
          </div>
        </div>
      </div>

      {/* Testimonials and Blogs */}
      <Testimonial />
      <BlogsHome />
    </section>
  );
}

export default AboutUsPage;
