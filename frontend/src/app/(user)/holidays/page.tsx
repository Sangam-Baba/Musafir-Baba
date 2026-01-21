import MixedPackagesClient from "./PackagesClient";
import { Metadata } from "next";
import Script from "next/script";
import { getAllCustomizedPackages } from "./customised-tour-packages/page";
import { Package } from "./[categorySlug]/PackageSlugClient";
import { CustomizedPackageInterface } from "./customised-tour-packages/[destination]/page";
import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import ReadMore from "@/components/common/ReadMore";

export interface Category {
  _id: string;
  name: string;
  slug: string;
  coverImage: {
    url: string;
    alt: string;
  };
  description: string;
}

interface CategoryResponse {
  data: Category[];
}

export const metadata: Metadata = {
  title: "Affordable Holiday Tour Packages - Domestic & International",
  description:
    "Explore incredible tour package without breaking the bank. Our affordable tour packages cover domestic and international trips. Easy booking and 24/7 support included.",
  alternates: {
    canonical: "https://musafirbaba.com/holidays",
  },
};

export const getCategory = async (): Promise<CategoryResponse> => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};
const getPackages = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/packages`, {
    next: { revalidate: 120 },
  });
  if (!res.ok) throw new Error("Failed to fetch posts");
  return res.json();
};
export default async function PackagesPage() {
  const data = await getPackages();
  const customizedPkgs = await getAllCustomizedPackages();
  const categorydata = await getCategory();
  const categories = categorydata?.data ?? [];

  const totalCategory = [...categories];

  const finalCustomizedPkgs = customizedPkgs.map(
    (pkg: CustomizedPackageInterface) => ({
      ...pkg,
      mainCategory: { slug: "customised-tour-packages" },
      price: pkg.plans[0].price,
    }),
  );
  const finalGroupPkgs = data?.data.map((pkg: Package) => ({
    ...pkg,
    price: pkg.batch[0].quad,
  }));
  const totalPkgs = [...finalCustomizedPkgs, ...finalGroupPkgs];

  const breadcrumbSchema = getBreadcrumbSchema("holidays");
  const collectionSchema = getCollectionSchema(
    "Holidays",
    "https://musafirbaba.com/holidays",
    totalPkgs.map((pkg: Package) => ({
      url: `https://musafirbaba.com/holidays/${pkg.mainCategory?.slug}/${pkg?.destination?.state}/${pkg.slug}`,
    })),
  );

  const content = `

<p>
  Planning a holiday should feel exciting—not overwhelming. At MusafirBaba, our holiday packages are designed to simplify travel planning while offering meaningful, well-balanced experiences across India and international destinations.
</p>

<p>
  This page brings together a wide range of tour packages curated for different travel styles, budgets, and purposes—so every traveler finds something that truly fits.
</p>

<h2>What Makes A Good Holiday Package?</h2>

<p>
  A good holiday is not just about visiting places—it’s about timing, comfort, pacing, and local experiences. Our holiday packages focus on:
</p>

<ul>
  <li>Practical itineraries</li>
  <li>Comfortable travel flow</li>
  <li>Destination-relevant experiences</li>
  <li>Flexible customization options</li>
</ul>

<p>
  Each package is created keeping real traveler expectations in mind, based on years of hands-on planning experience.
</p>

<h2>Explore Domestic Holiday Packages</h2>

<p>
  India offers unmatched travel diversity. Our domestic holiday packages cover:
</p>

<ul>
  <li>Hill stations and mountain regions</li>
  <li>Beach and island destinations</li>
  <li>Cultural and heritage circuits</li>
  <li>Wildlife and nature escapes</li>
  <li>Spiritual and pilgrimage routes</li>
</ul>

<p>
  These packages are suitable for families, couples, senior travelers, and group tours, with itineraries designed for comfort and clarity.
</p>

<h2>International Holiday Packages From India</h2>

<p>
  For travelers looking beyond borders, MusafirBaba offers international holiday packages to popular and emerging destinations.
</p>

<p>
  These packages are planned considering:
</p>

<ul>
  <li>Travel duration from India</li>
  <li>Seasonal suitability</li>
  <li>Visa feasibility</li>
  <li>Overall trip balance</li>
</ul>

<p>
  International packages are ideal for honeymooners, families, and group travelers seeking smooth, well-organized travel.
</p>

<h2>Holiday Packages By Travel Style</h2>

<p>
  To make discovery easier, holidays are grouped by intent:
</p>

<ul>
  <li><strong>Family Tours</strong> – Comfortable pacing and kid-friendly experiences</li>
  <li><strong>Honeymoon Packages</strong> – Romantic settings and relaxed itineraries</li>
  <li><strong>Group Tours</strong> – Shared experiences with structured schedules</li>
  <li><strong>Backpacking Trips</strong> – Budget-conscious and flexible travel</li>
  <li><strong>Religious Tours</strong> – Faith-based journeys with logistical ease</li>
  <li><strong>Corporate Tours</strong> – Business-aligned travel with planning support</li>
</ul>

<p>
  This structure helps travelers choose faster and plan better.
</p>

<h2>Why Choose MusafirBaba Holiday Packages?</h2>

<p>
  Our holiday packages are built on:
</p>

<ul>
  <li>Destination expertise</li>
  <li>Real-time planning insights</li>
  <li>Transparent inclusions</li>
  <li>Traveler-first approach</li>
</ul>

<p>
  We prioritize clarity over complexity—so travelers know what to expect before they travel.
</p>

<h2>Who Are These Packages For?</h2>

<p>
  Our holiday packages are suitable for:
</p>

<ul>
  <li>First-time travelers</li>
  <li>Experienced explorers</li>
  <li>Families and senior citizens</li>
  <li>Couples and honeymooners</li>
  <li>Corporate groups and institutions</li>
</ul>

<p>
  Whether you’re planning months in advance or closer to travel dates, the packages offer flexibility.
</p>

<h2>Planning Support Beyond Booking</h2>

<p>
  MusafirBaba supports travelers beyond just package selection by offering:
</p>

<ul>
  <li>Destination guidance</li>
  <li>Travel documentation assistance</li>
  <li>On-ground coordination</li>
  <li>Trip preparation advice</li>
</ul>

<p>
  This ensures a smooth experience from planning to return.
</p>
`;
  return (
    <div>
      <Hero
        image="https://cdn.musafirbaba.com/images/tour_package_k5ijnt.webp"
        title="Holidays"
        align="center"
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      {/* SHow description */}

      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
        <ReadMore content={content} />
      </div>
      <MixedPackagesClient data={totalPkgs} category={totalCategory} />
      {/* JSON-LD Schema */}
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <Script
        id="collection-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />
    </div>
  );
}
