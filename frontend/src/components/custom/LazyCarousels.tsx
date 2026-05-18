"use client";

import dynamic from "next/dynamic";

export const LazyVideoSection = dynamic(
  () => import("./VideoSection"),
  { ssr: false }
);

export const LazyTestimonial = dynamic(
  () => import("./Testimonial").then((mod) => ({ default: mod.Testimonial })),
  { ssr: false }
);

export const LazyImageGallery = dynamic(
  () => import("./ImageGallery").then((mod) => ({ default: mod.ImageGallery })),
  { ssr: false }
);
