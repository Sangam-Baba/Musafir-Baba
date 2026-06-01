import { Suspense } from "react";
import Image from "next/image";
import Script from "next/script";

// ─── Critical above-the-fold: direct imports (Server Components) ───────────
import GlobalSearch from "@/components/global-search/GlobalSearch";
import SecondSectionServer from "@/components/custom/SecondSectionServer";
import VisaHome from "@/components/custom/VisaHome";
import { SevenSection } from "@/components/custom/SevenSection";
import FeaturedTourSSG from "@/components/custom/FeaturedTourSSG";
import BlogsHome from "@/components/custom/BlogsHome";

// ─── Below-the-fold Server Components (direct imports) ───────────────
import SectionFour from "@/components/custom/SectionFour";
import SectionFive from "@/components/custom/SectionFive";
import WhyChoose from "@/components/custom/WhyChoose";
import HomeBooking from "@/components/custom/HomeBooking";


// ─── Below-the-fold Client Components (dynamic imports to defer JS) ──
import dynamic from "next/dynamic";
const DestinationSection = dynamic(
  () => import("@/components/custom/DestinationSection").then((mod) => ({ default: mod.DestinationSection })),
  { loading: () => <div className="h-64 animate-pulse bg-gray-50 rounded-xl mx-4 my-2" /> }
);
import { LazyVideoSection, LazyTestimonial, LazyImageGallery } from "@/components/custom/LazyCarousels";
const Faqs = dynamic(
  () => import("@/components/custom/Faqs").then((mod) => ({ default: mod.Faqs })),
  { loading: () => <div className="h-64 animate-pulse bg-gray-50 rounded-xl mx-4 my-2" /> }
);
const LoginAutoOpen = dynamic(
  () => import("@/components/User/LoginAutoOpen")
);
const PopupBanner = dynamic(
  () => import("@/components/custom/PopupBanner").then((mod) => ({ default: mod.PopupBanner }))
);
const Partners = dynamic(
  () => import("@/components/custom/Partners"),
  { loading: () => <div className="h-40 animate-pulse bg-gray-50 rounded-xl mx-4 my-2" /> }
);

import { getOrganizationSchema } from "@/lib/schema/organization.schema";
import { getLocalSchema } from "@/lib/schema/local.schema";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";

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
      "Yes, we provide 24/7 customer support throughout your journey via phone, WhatsApp, and email to ensure a hassle-free travel experience. You can reach us at +91 92896 02447",
  },
];

const testi = [
  {
    id: 1,
    name: "Poonom Ranjan",
    location: "Traveler",
    comment: `Musafirbaba provided excellent service in a highly professional manner. They went above and beyond to assist me, and I want to give a special shoutout to Anu, my tour manager.`,
    "rating": 4
  },
  {
    id: 2,
    name: "Anupam Ray",
    location: "Traveler",
    "rating": 4.6,
    comment: `I loved booking through Musafirbaba. I have recommended them to so many people! Great deals, easy to get things organised, had a great experience.`,
  },
  {
    id: 3,
    name: "Rohit Singh",
    location: "Traveler",
    "rating": 5,
    comment:
      "Booking with Musafir Baba was the best decision for our family trip. Everything was perfectly organized — from comfortable stays to local guides who truly knew the hidden gems.",
  },
  {
    id: 4,
    name: "Shubham Sharma",
    location: "Traveler",
    "rating": 4,
    comment:
      "I was amazed at how easy Musafir Baba made the entire process. The itinerary was well-balanced, giving me enough time to explore and relax. It felt like I had a personal travel partner by my side throughout the journey.",
  },
  {
    id: 5,
    name: "Dr. Ritu Mishra",
    location: "Traveler",
    "rating": 4.9,
    comment:
      "The team at Musafir Baba is incredibly professional yet so friendly. They were always available for any questions, and every little detail was taken care of. I'll definitely be planning my next trip with them again!",
  },
];

const images = [
  { id: 1, url: "/frame1.webp", alt: "" },
  { id: 2, url: "/frame2.jpg", alt: "" },
  { id: 3, url: "/frame3.jpg", alt: "" },
  { id: 4, url: "/frame4.webp", alt: "" },
  { id: 5, url: "/frame5.jpg", alt: "" },
  { id: 6, url: "/frame6.jpg", alt: "" },
  { id: 7, url: "/frame7.jpg", alt: "" },
  { id: 8, url: "/frame8.webp", alt: "" },
];

export default async function HomePage() {
  const organizationSchema = getOrganizationSchema();
  const localBusinessSchema = getLocalSchema();
  const breadcrumbSchema = getBreadcrumbSchema("/");

  return (
    <main>
      {/* ── Hero Banner (LCP) ─────────────────────────────────────────── */}
      <section className="w-full flex px-4 md:px-8 lg:px-30 py-16 relative bg-cover bg-center bg-no-repeat text-white h-[400px] md:h-[600px] 2xl:h-[800px] items-center">
        <Image
          src="/homebanner.webp"
          alt="Home Banner MusafirBaba"
          fill
          priority
          fetchPriority="high"
          quality={70}
          sizes="100vw"
          className="object-cover"
        />
        
        {/* Searchbar positioned just below navbar */}
        <div className="absolute top-4 md:top-8 left-0 right-0 z-50 flex justify-center px-4">
          <div className="w-full max-w-[720px]">
            <GlobalSearch />
          </div>
        </div>

        <div className="flex flex-col ml-4 md:ml-8 lg:ml-12 gap-5 md:gap-7 items-center z-10 w-[90%] md:w-[70%] lg:w-[60%] xl:w-[55%] relative">
          <div className="text-center flex flex-col items-center justify-center max-w-4xl mx-auto mt-4 md:mt-8">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1.5 mb-5 md:mb-6 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[11px] md:text-xs font-semibold tracking-widest text-white shadow-xl hover:bg-white/15 transition-colors uppercase">
              <span className="animate-pulse text-[#FE5300]">⚡</span> Instant Booking Platform
            </div> */}
            
            <h1 className="text-[28px] font-poppins font-extrabold md:text-4xl lg:text-5xl xl:text-6xl leading-[1.15] md:leading-[1.1] tracking-tight text-white drop-shadow-lg">
              Book your{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#74ff18] via-green-300 to-[#74ff18] bg-[length:200%_auto] animate-border-gradient">
                  dream trip
                </span>
              </span>{" "}
              in just
              <br className="hidden md:block" />
              <span className="inline-flex items-center mt-1 md:mt-3">
                <span className="relative whitespace-nowrap">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FE5300] via-orange-300 to-[#FE5300] bg-[length:200%_auto] animate-border-gradient">
                    60 seconds
                  </span>
                  <span className="absolute -bottom-1 md:-bottom-2 left-0 right-0 h-[3px] md:h-[4px] rounded-full bg-gradient-to-r from-transparent via-[#FE5300] to-transparent opacity-80 animate-pulse"></span>
                </span>
              </span>
            </h1>
            
            <p className="hidden md:block text-sm md:text-lg lg:text-xl font-light text-white/90 mt-5 md:mt-7 max-w-2xl mx-auto drop-shadow-md tracking-wide">
              Get curated tours &amp; seamless visa assistance — <span className="font-medium text-white">all in one place.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Above-the-fold Server Sections (streamed) ─────────────────── */}
      <Suspense fallback={<div className="h-40 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <SecondSectionServer />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <VisaHome />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <SevenSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <FeaturedTourSSG />
      </Suspense>

      {/* ── Below-the-fold Components (Server & Client interweaved) ──────── */}
      <SectionFour />
      <SectionFive />
      <DestinationSection />
      <LazyVideoSection />
      <WhyChoose />
      <LazyTestimonial data={testi} />
      <LazyImageGallery
        title="Memories in Motion"
        description="Picture Perfect Moments with the Best Travel Agency in India"
        data={images}
      />
      <HomeBooking />
      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <BlogsHome />
      </Suspense>
      <Partners />
      <Faqs faqs={faqs} />
      <Suspense fallback={null}>
        <LoginAutoOpen />
      </Suspense>
      {/* <PopupBanner /> */}

      {/* ── JSON-LD Structured Data ───────────────────────────────────── */}
      <Script
        id="organization-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <Script
        id="local-business-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
      />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </main>
  );
}
