"use client";

import dynamic from "next/dynamic";

export const LazyVideoSection = dynamic(
  () => import("./VideoSection"),
  { ssr: false, loading: () => <div className="h-[400px] animate-pulse bg-gray-50 rounded-xl mx-4 my-2" /> }
);

export const LazyTestimonial = dynamic(
  () => import("./Testimonial").then((mod) => ({ default: mod.Testimonial })),
  { ssr: false, loading: () => <div className="h-[400px] animate-pulse bg-gray-50 rounded-xl mx-4 my-2" /> }
);

export const LazyImageGallery = dynamic(
  () => import("./ImageGallery").then((mod) => ({ default: mod.ImageGallery })),
  { ssr: false, loading: () => <div className="h-[400px] animate-pulse bg-gray-50 rounded-xl mx-4 my-2" /> }
);
