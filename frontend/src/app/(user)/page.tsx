import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import Script from "next/script";
import { Users, Star, Briefcase, Globe, Search, ChevronDown } from "lucide-react";

// ─── Critical above-the-fold: direct imports (Server Components) ───────────
import SecondSectionServer from "@/components/custom/SecondSectionServer";
import VisaHome from "@/components/custom/VisaHome";
import { SevenSection } from "@/components/custom/SevenSection";
import FeaturedTourSSG from "@/components/custom/FeaturedTourSSG";
import BlogsHome from "@/components/custom/BlogsHome";
import HeroSearchBox from "@/components/custom/HeroSearchBox";

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
const Newslatter = dynamic(
  () => import("@/components/common/Newslatter"),
  { loading: () => <div className="h-40 animate-pulse bg-[#FE5300] rounded-xl mx-4 my-2" /> }
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
      {/* ── Hero Banner (New Design) ─────────────────────────────────────────── */}
      <section className="w-full px-4 md:px-10 py-6 lg:py-8 relative flex flex-col items-start justify-between h-[calc(100vh-130px)] min-h-[550px] overflow-hidden">
        <Image
          src="/homebanner11.avif"
          alt="Home Banner"
          fill
          priority
          className="object-cover -z-10"
        />

        <div className="w-full max-w-full mx-auto flex flex-col items-start mt-4 md:mt-8 relative z-10">
          
          <style dangerouslySetInnerHTML={{__html: `
            @keyframes customBlink {
              0%, 100% { opacity: 1; }
              50% { opacity: 0; }
            }
            .animate-custom-blink {
              animation: customBlink 1.2s ease-in-out infinite;
            }
            @keyframes customBreathe {
              0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
              50% { transform: scale(1.02); box-shadow: 0 0 10px 0 rgba(16, 185, 129, 0.2); }
            }
            .animate-custom-breathe {
              animation: customBreathe 3s ease-in-out infinite;
            }
            @keyframes mountainBreathe {
              0%, 100% { transform: scaleY(1); }
              50% { transform: scaleY(1.05); }
            }
            .animate-mountain-breathe-1 {
              animation: mountainBreathe 8s ease-in-out infinite;
              transform-origin: bottom;
            }
            .animate-mountain-breathe-2 {
              animation: mountainBreathe 12s ease-in-out infinite;
              transform-origin: bottom;
              animation-delay: -4s;
            }
            .animate-mountain-breathe-3 {
              animation: mountainBreathe 15s ease-in-out infinite;
              transform-origin: bottom;
              animation-delay: -8s;
            }
          `}} />

          <div className="flex items-center gap-2 bg-emerald-50 px-3 py-1.5 rounded-md border border-emerald-200 mb-4 shadow-sm animate-custom-breathe">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-custom-blink"></span>
            <span className="text-[10px] md:text-xs font-bold tracking-[0.12em] text-emerald-700 uppercase pt-[1px]">
              India's Trusted Travel Partner
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-[64px] font-medium text-white leading-[1.1] tracking-tight mb-2 w-full">
            Book your <span className="italic font-serif text-[#FE5300]">dream trip</span><br className="hidden md:block"/> in just 60 seconds
          </h1>
          
          <p className="text-sm md:text-base text-gray-200 font-light max-w-2xl mb-8 md:mb-12">
            Curated tours and seamless visa assistance — all in one place.
          </p>

          {/* Search Interface Container */}
          <HeroSearchBox />

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full mb-4 relative z-20">
            {[
              { label: "Mountain treks", slug: "mountain-treks" },
              { label: "Honeymoon", slug: "honeymoon-packages" },
              { label: "Religious tours", slug: "religious-tours" },
              { label: "Weekend trips", slug: "weekend-getaways" },
              { label: "Family Tours", slug: "family-tours" },
              { label: "Group Tour", slug: "group-tour-packages" },
            ].map((pill, idx) => {
              const isActive = pill.label === "Religious tours";
              return (
                <Link 
                  href={`/holidays/${pill.slug}`}
                  key={idx}
                  className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[11px] md:text-[13px] font-medium transition-all ${
                    isActive 
                      ? "border border-[#FE5300] text-[#FE5300] bg-white shadow-sm" 
                      : "border border-gray-300 text-gray-500 hover:border-gray-400 hover:text-gray-700 bg-white"
                  }`}
                >
                  {pill.label}
                </Link>
              );
            })}
          </div>

        </div>

        {/* Bottom Stats Banner */}
        <div className="w-full mx-auto border-t border-white/20 pt-6 pb-2 mt-auto relative z-20">
          <div className="flex flex-wrap justify-center items-center gap-y-6 md:gap-y-0 w-full max-w-6xl mx-auto">
            
            {/* Stat 1 */}
            <div className="w-1/2 md:w-1/4 flex items-center justify-center gap-4 md:border-r border-white/20">
              <Users className="w-6 h-6 md:w-7 md:h-7 text-[#FE5300]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-lg md:text-[22px] font-semibold text-white leading-tight">24,247</span>
                <span className="text-[12px] md:text-[14px] text-gray-300 font-normal">Happy travellers</span>
              </div>
            </div>

            {/* Stat 2 */}
            <div className="w-1/2 md:w-1/4 flex items-center justify-center gap-4 md:border-r border-white/20">
              <Star className="w-6 h-6 md:w-7 md:h-7 text-[#FE5300]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-lg md:text-[22px] font-semibold text-white flex items-center gap-1.5 leading-tight">4.8 <Star className="w-3.5 h-3.5 fill-white text-white" /></span>
                <span className="text-[12px] md:text-[14px] text-gray-300 font-normal">Google rating</span>
              </div>
            </div>

            {/* Stat 3 */}
            <div className="w-1/2 md:w-1/4 flex items-center justify-center gap-4 md:border-r border-white/20">
              <Briefcase className="w-6 h-6 md:w-7 md:h-7 text-[#FE5300]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-lg md:text-[22px] font-semibold text-white leading-tight">500+</span>
                <span className="text-[12px] md:text-[14px] text-gray-300 font-normal">Tour packages</span>
              </div>
            </div>

            {/* Stat 4 */}
            <div className="w-1/2 md:w-1/4 flex items-center justify-center gap-4">
              <Globe className="w-6 h-6 md:w-7 md:h-7 text-[#FE5300]" strokeWidth={1.5} />
              <div className="flex flex-col">
                <span className="text-lg md:text-[22px] font-semibold text-white leading-tight">180+</span>
                <span className="text-[12px] md:text-[14px] text-gray-300 font-normal">Visa countries</span>
              </div>
            </div>

          </div>
        </div>

      </section>

      {/* ── Above-the-fold Server Sections (streamed) ─────────────────── */}
      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <VisaHome />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <FeaturedTourSSG />
      </Suspense>

      {/* ── Below-the-fold Components (Server & Client interweaved) ──────── */}
      <DestinationSection />
      <WhyChoose />
      <LazyTestimonial data={testi} />
      <SectionFive />
      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <BlogsHome />
      </Suspense>
      <Partners />
      <Faqs faqs={faqs} />
      <Newslatter />
      
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
