import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import RentalsClient from "../RentalsClient";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ReadMore from "@/components/common/ReadMore";

// /rental/{segment} serves two kinds of page:
//   1. /rental/{type}      e.g. /rental/car   — checked FIRST, rendered exactly
//                          as before so existing URLs are unchanged
//   2. /rental/{location}  e.g. /rental/delhi — all vehicles at that location
// (Next.js allows one dynamic folder per level, so both share this file.)

const getVehicleTypeBySlug = async (slug: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/slug/${slug}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) {
    // Any failure here (genuine 404 or a transient backend blip) routes
    // through the same `!typeData -> notFound()` handling the page already
    // has below, instead of throwing and crashing the entire static build.
    if (res.status !== 404) console.error("Failed to fetch vehicle type:", res.status);
    return null;
  }
  const data = await res.json();
  return data?.data;
};

const getDestinationBySlug = async (slug: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination/slug/${slug}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) {
    if (res.status !== 404) console.error("Failed to fetch destination:", res.status);
    return null;
  }
  const data = await res.json();
  return data?.data;
};

const getAllVehicles = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/all`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) {
    console.error("Failed to fetch vehicles:", res.status);
    return [];
  }
  const data = await res.json();
  return data?.data;
};

// Type wins when a segment is both, matching the old behaviour of this URL
const resolveSegment = async (segment: string) => {
  const typeData = await getVehicleTypeBySlug(segment);
  if (typeData) return { kind: "type" as const, data: typeData };
  const destData = await getDestinationBySlug(segment);
  if (destData) return { kind: "location" as const, data: destData };
  return null;
};

export async function generateMetadata({ params }: { params: Promise<{ location: string }> }): Promise<Metadata> {
  const { location: segment } = await params;
  const resolved = await resolveSegment(segment);

  if (!resolved) return { title: "Not Found" };

  if (resolved.kind === "type") {
    const typeData = resolved.data;
    const url = typeData.canonicalUrl
      ? `https://musafirbaba.com${typeData.canonicalUrl}`
      : `https://musafirbaba.com/rental/${segment}`;

    return {
      title: typeData.metaTitle || `${typeData.name} Rentals - MusafirBaba`,
      description: typeData.metaDescription || `Rent ${typeData.name} easily with MusafirBaba.`,
      keywords: typeData.keywords?.join(", "),
      alternates: {
        canonical: url,
      },
    };
  }

  const destData = resolved.data;
  return {
    title: destData.metaTitle || `${destData.title || destData.name} Rentals - MusafirBaba`,
    description: destData.metaDescription || `Rent vehicles in ${destData.name} easily with MusafirBaba.`,
    keywords: destData.keywords?.join(", "),
    alternates: {
      // Always self-referencing (see the note in ./[vehicleType]/page.tsx)
      canonical: `https://musafirbaba.com/rental/${segment}`,
    },
  };
}

export default async function RentalSegmentPage({ params }: { params: Promise<{ location: string }> }) {
  const { location: segment } = await params;

  const [resolved, vehicles] = await Promise.all([
    resolveSegment(segment),
    getAllVehicles()
  ]);

  if (!resolved) {
    notFound();
  }

  if (resolved.kind === "type") {
    const typeData = resolved.data;
    return (
      <main>
        <Hero
          image={typeData.bannerImage?.url || "/assets/images/cars/car-banner.png"}
          title={typeData.metaTitle || `${typeData.name} Rentals`}
        />
        <div className="max-w-7xl mx-auto">
          <Breadcrumb title={typeData.name} />

          {typeData.content && (
            <div className="mx-4 md:mx-6 lg:mx-8 mt-6 mb-10">
              <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                <ReadMore content={typeData.content} />
              </section>
            </div>
          )}
        </div>

        <RentalsClient vehicles={vehicles} initialVehicleType={typeData.name.toLowerCase()} />
      </main>
    );
  }

  const destData = resolved.data;
  return (
    <main>
      <Hero
        image={destData.bannerImage?.url || "/assets/images/cars/car-banner.png"}
        title={destData.title || destData.metaTitle || `Rentals in ${destData.name}`}
      />
      <div className="max-w-7xl mx-auto">
        <Breadcrumb title={destData.name} />

        {destData.content && (
          <div className="mx-4 md:mx-6 lg:mx-8 mt-6 mb-10">
            <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
              <ReadMore content={destData.content} />
            </section>
          </div>
        )}
      </div>

      <RentalsClient vehicles={vehicles} initialLocationId={destData._id} />
    </main>
  );
}
