"use client";
import SecondSection from "../../components/custom/SecondSection";
import SectionFour from "../../components/custom/SectionFour";
import SectionFive from "../../components/custom/SectionFive";
import { Testimonial } from "../../components/custom/Testimonial";
import { ImageGallery } from "../../components/custom/ImageGallery";
import { SevenSection } from "../../components/custom/SevenSection";
import { DestinationSection } from "../../components/custom/DestinationSection";
import { Faqs } from "../../components/custom/Faqs";
import { FeaturedTour } from "../../components/custom/FeaturedTour";
import SearchBanner from "@/components/custom/Search";
import ThirdSection from "@/components/custom/ThirdSection";
import BlogsHome from "@/components/custom/BlogsHome";
import Image from "next/image";
import HomeBooking from "../../components/custom/HomeBooking";

const faqs = [
  {
    id: 1,
    question: "What services does Musafirbaba offer?",
    answer:
      "We provide end-to-end travel solutions including tourist visas (Singapore, Dubai, Schengen, USA), domestic & international tour packages, flight & hotel bookings, and personalized travel planning for individuals, families, and groups.",
  },
  {
    id: 2,
    question: "What tour packages do you offer?",
    answer:
      "We offer domestic tours like Rajasthan, Kerala, Himachal, Kashmir, Goa, and international tours including Dubai, Singapore, Thailand, Europe, and Maldives, with customized options for honeymoon, family, group, and corporate trips.",
  },
  {
    id: 3,
    question: "What makes Musafirbaba different from others?",
    answer:
      "With 10,000+ happy travelers, 4.8★ Google rating, expert visa consultants, best prices, 24/7 support, and total transparency, we offer both visa and tour services under one roof with guaranteed satisfaction.",
  },
  {
    id: 4,
    question: "Is there a cancellation fee & refund policy?",
    answer:
      "Yes, we have clear cancellation and refund policies; full details are available in our Terms & Conditions.",
  },
  {
    id: 5,
    question: "How can I check tour availability and prices?",
    answer:
      "You can check availability and get instant pricing by visiting our website, contacting us via call or WhatsApp, or emailing our travel experts.",
  },
  {
    id: 6,
    question: "Do you provide 24/7 customer support?",
    answer:
      "Yes, we provide 24/7 customer support throughout your journey via phone, WhatsApp, and email to ensure a hassle-free travel experience.You can reach us at +91 92896 02447",
  },
];

export default function HomePage() {
  return (
    <main className="">
      <div
        className="relative z-10 px-5 md:px-10 flex md:flex-row flex-col gap-4 items-center justify-around mt-16 md:mt-0"
        // style={{ backgroundImage: "url('/baba-page.jpg')" }}
      >
        {/* <div className="absolute inset-0 bg-black/40 z-0"></div> */}
        <div className="flex flex-col gap-10 items-center md:items-start">
          <Image
            className="w-full  object-cover"
            src="/Musafir-Baba-text.png"
            width={640}
            height={127}
            alt="Musafirbaba"
            priority
            fetchPriority="high"
          />
          <SearchBanner />
        </div>
        <div className="hidden md:block">
          <Image
            className="w-full h-[600px] object-cover"
            src="/BabaImg.png"
            width={362}
            height={578}
            alt="Musafirbaba"
            priority
            fetchPriority="high"
          />
        </div>
      </div>
      <SecondSection />
      <ThirdSection />
      <SectionFour />
      <SectionFive />
      <FeaturedTour />
      <SevenSection />
      <DestinationSection />
      <ImageGallery />
      <HomeBooking />
      <Testimonial />
      <BlogsHome />
      <Faqs faqs={faqs} />
    </main>
  );
}
