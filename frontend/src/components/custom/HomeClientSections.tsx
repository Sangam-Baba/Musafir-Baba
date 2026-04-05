"use client";

/**
 * HomeClientSections.tsx
 *
 * A single client boundary that lazy-loads all below-the-fold
 * client components. This keeps page.tsx as a pure Server Component
 * while still enabling next/dynamic with ssr:false.
 */

import React from "react";
import dynamic from "next/dynamic";

// Lazy load all below-the-fold sections
const SectionFour = dynamic(() => import("./SectionFour"), { ssr: false });
const SectionFive = dynamic(() => import("./SectionFive"), { ssr: false });
const DestinationSection = dynamic(
  () => import("./DestinationSection").then((mod) => ({ default: mod.DestinationSection })),
  { ssr: false }
);
const VideoSection = dynamic(() => import("./VideoSection"), { ssr: false });
const WhyChoose = dynamic(() => import("./WhyChoose"), { ssr: false });
const Testimonial = dynamic(
  () => import("./Testimonial").then((mod) => ({ default: mod.Testimonial })),
  { ssr: false }
);
const ImageGallery = dynamic(
  () => import("./ImageGallery").then((mod) => ({ default: mod.ImageGallery })),
  { ssr: false }
);
const HomeBooking = dynamic(() => import("./HomeBooking"), { ssr: false });
const Partners = dynamic(() => import("./Partners"), { ssr: false });
const Faqs = dynamic(
  () => import("./Faqs").then((mod) => ({ default: mod.Faqs })),
  { ssr: false }
);
const LoginAutoOpen = dynamic(
  () => import("../User/LoginAutoOpen"),
  { ssr: false }
);
const PopupBanner = dynamic(
  () => import("./PopupBanner").then((mod) => ({ default: mod.PopupBanner })),
  { ssr: false }
);

interface Testimonial {
  id: number;
  name: string;
  location: string;
  comment: string;
}

interface GalleryImage {
  id: number;
  url: string;
  alt: string;
}

interface Faq {
  id: number;
  question: string;
  answer: string;
}

interface Props {
  testi: Testimonial[];
  images: GalleryImage[];
  faqs: Faq[];
  auth: string | null;
  children?: React.ReactNode;
}

export default function HomeClientSections({ testi, images, faqs, auth, children }: Props) {
  return (
    <>
      <SectionFour />
      <SectionFive />
      <DestinationSection />
      <VideoSection />
      <WhyChoose />
      <Testimonial data={testi} />
      <ImageGallery
        title="Memories in Motion"
        description="Picture Perfect Moments with the Best Travel Agency in India"
        data={images}
      />
      <HomeBooking />
      {children}
      <Partners />
      <Faqs faqs={faqs} />
      <LoginAutoOpen auth={auth} />
      <PopupBanner />
    </>
  );
}
