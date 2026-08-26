import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Script from "next/script";

export const metadata: Metadata = {
  description:
    "Planning your next trip? Call MusafirBaba - Best travel agency in India for holiday packages, visa assistance, car rentals & flight, bus or hotel bookings",
};

// ─── Critical above-the-fold: direct imports (Server Components) ───────────
import SecondSectionServer from "@/components/custom/SecondSectionServer";
import VisaHome from "@/components/custom/VisaHome";
import { SevenSection } from "@/components/custom/SevenSection";
import FeaturedTourSSG from "@/components/custom/FeaturedTourSSG";
import BlogsHome from "@/components/custom/BlogsHome";
import HeroSearchWidget from "@/components/custom/HeroSearchWidget";
import HeroStatsRail from "@/components/custom/HeroStatsRail";
import TrySearchChips from "@/components/custom/TrySearchChips";
import TrustBadgesRow from "@/components/custom/TrustBadgesRow";
import QuickServiceTiles from "@/components/custom/QuickServiceTiles";
import TravelMoodSection from "@/components/custom/TravelMoodSection";
import ExploreDestinationsPanel from "@/components/custom/ExploreDestinationsPanel";
import VisaMadeEasySection from "@/components/custom/VisaMadeEasySection";
import WhyChooseBanner from "@/components/custom/WhyChooseBanner";
import TestimonialsBanner from "@/components/custom/TestimonialsBanner";
import TravelStoriesNewsSection from "@/components/custom/TravelStoriesNewsSection";
import HomeCTABanner from "@/components/custom/HomeCTABanner";

// ─── Below-the-fold Client Components (dynamic imports to defer JS) ──
import dynamic from "next/dynamic";


const WhyChoose = dynamic(() => import("@/components/custom/WhyChoose").then(mod => ({ default: mod.default })));
const SectionFive = dynamic(() => import("@/components/custom/SectionFive").then(mod => ({ default: mod.default })));
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
  { id: 1, url: "/frame1.webp", alt: "Tour destination scenery" },
  { id: 2, url: "/frame2.jpg", alt: "Travelers exploring nature" },
  { id: 3, url: "/frame3.jpg", alt: "Beautiful landscape view" },
  { id: 4, url: "/frame4.webp", alt: "Cultural heritage site" },
  { id: 5, url: "/frame5.jpg", alt: "Scenic mountain peak" },
  { id: 6, url: "/frame6.jpg", alt: "Relaxing beach destination" },
  { id: 7, url: "/frame7.jpg", alt: "Historic architecture" },
  { id: 8, url: "/frame8.webp", alt: "Group tour adventure" },
];

// Same `/category` endpoint holidays/page.tsx and TravelMoodSection.tsx
// already fetch (Next.js dedupes identical fetch calls, so this doesn't add
// a real extra network round-trip) — feeds the hero search widget's
// Holidays "Package Type" dropdown with real category slugs.
async function getHeroCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data ?? []).map((c: { _id: string; name: string; slug: string }) => ({
    id: c._id,
    name: c.name,
    slug: c.slug,
  }));
}

// Same `/vehicle/all` endpoint rental/page.tsx already fetches — derives the
// unique vehicle types and locations for the hero widget's Rentals tab,
// mirroring the exact derivation RentalsClient.tsx does client-side.
async function getHeroVehicleFilters(): Promise<{
  types: string[];
  locations: { id: string; name: string }[];
}> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/all`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { types: [], locations: [] };
  const data = await res.json();
  const vehicles: { vehicleType?: string; location?: { _id: string; name: string } }[] =
    data?.data ?? [];

  // RentalsClient.tsx's own Category dropdown always normalizes vehicleType
  // to lowercase (both its SelectItem values and its `=== "car"` seats-filter
  // check) — matching that convention here so a value round-tripped through
  // the URL lands on the right selected option there instead of showing
  // blank (filtering itself was already case-insensitive either way).
  const types = Array.from(
    new Set(vehicles.map((v) => v.vehicleType?.toLowerCase()).filter((t): t is string => Boolean(t))),
  );

  const seenLocations = new Map<string, { id: string; name: string }>();
  vehicles.forEach((v) => {
    if (v.location?._id && !seenLocations.has(v.location._id)) {
      seenLocations.set(v.location._id, { id: v.location._id, name: v.location.name });
    }
  });

  return { types, locations: Array.from(seenLocations.values()) };
}

export default async function HomePage() {
  const organizationSchema = getOrganizationSchema();
  const localBusinessSchema = getLocalSchema();
  const breadcrumbSchema = getBreadcrumbSchema("/");
  const [heroCategories, heroVehicleFilters] = await Promise.all([
    getHeroCategories(),
    getHeroVehicleFilters(),
  ]);

  return (
    <main>
      {/* ── Hero Banner (New Design) ─────────────────────────────────────────── */}
      {/* Header is now `fixed` and transparent-over-photo on this page (see
          components/common/Header.tsx), so it no longer reserves layout
          space above the hero the way the old in-flow header did. h-screen
          + top padding replaces the old h-[calc(100vh-130px)] trick, so the
          photo still runs full-bleed behind the nav while the actual content
          (badge/heading/search) clears it. */}
      <section className="w-full px-6 md:px-14 lg:px-20 pt-20 md:pt-28 lg:pt-32 pb-3 md:pb-4 lg:pb-6 relative flex flex-col items-start justify-between h-screen min-h-[560px] overflow-hidden">
        <Image
          // src="/homebanner32.avif"
          src="/homebanner007.avif"
          alt="Home Banner"
          fill
          priority
          className="object-cover -z-10"
        />

        <div className="w-full max-w-full mx-auto flex flex-col items-start mt-2 md:mt-4 relative z-10">

          <HeroStatsRail />

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
              50% { transform: scale(1.02); box-shadow: 0 0 10px 0 rgba(16, 185, 129, 0.25); }
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
            <span className="text-[10px] md:text-xs font-bold tracking-[0.12em] text-emerald-950 uppercase pt-[1px]">
              India&apos;s Most Trusted Travel Partner
            </span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-[60px] font-medium text-gray-900 leading-[1.1] tracking-tight mb-1 md:mb-2 w-full max-w-2xl">
            Where will your <span className="italic font-serif text-[#FE5300]">next story</span> begin?
          </h1>

          <p className="text-sm md:text-base text-gray-700 font-light max-w-2xl mb-1 md:mb-2">
            From mountains and beaches to spiritual journeys and global adventures — we plan every trip like it&apos;s our own.
          </p>

          {/* Search Interface Container */}
          <HeroSearchWidget categories={heroCategories} vehicleFilters={heroVehicleFilters} />

          {/* Suggestion chips */}
          <TrySearchChips />

        </div>

      </section>

      {/* ── New: Trust badges / quick-service tiles / category carousel ─── */}
      <TrustBadgesRow />
      <QuickServiceTiles />
      <Suspense fallback={<div className="h-64 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <TravelMoodSection />
      </Suspense>

      {/* ── Above-the-fold Server Sections (streamed) ─────────────────── */}
      {/* VisaHome temporarily disabled per request — keep for future use,
          do not delete.
      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <VisaHome />
      </Suspense>
      */}

      <Suspense fallback={<div className="min-h-[600px] bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <FeaturedTourSSG />
      </Suspense>

      {/* ── New: Explore Destinations / Visa Made Easy interactive map panels ── */}
      <section className="w-full px-4 md:px-10 py-8 md:py-10">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-5">
          <ExploreDestinationsPanel />
          <Suspense fallback={<div className="h-[420px] bg-gray-100 animate-pulse rounded-2xl" />}>
            <VisaMadeEasySection />
          </Suspense>
        </div>
      </section>

      {/* ── Below-the-fold Components (Server & Client interweaved) ──────── */}
      {/* DestinationSection temporarily disabled per request — superseded by
          the Explore Destinations panel above; keep for future use, do not
          delete.
      <DestinationSection />
      */}
      <WhyChooseBanner />
      <TestimonialsBanner />
      {/* Fixed sequence per request: testimonials → blog/news → partners → enquiry form */}
      <Suspense fallback={<div className="h-96 bg-gray-50 animate-pulse rounded-xl mx-4 my-2" />}>
        <TravelStoriesNewsSection />
      </Suspense>
      <Partners />
      <SectionFive />
      <Faqs faqs={faqs} />
      <HomeCTABanner />

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
