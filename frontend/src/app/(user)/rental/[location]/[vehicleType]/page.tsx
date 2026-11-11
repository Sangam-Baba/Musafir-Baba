import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import RentalsClient from "../../RentalsClient";
import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import ReadMore from "@/components/common/ReadMore";
import PageFaqs from "@/components/common/PageFaqs";

// /rental/{location}/{type} — e.g. /rental/delhi/car.
// The old order, /rental/{type}/{location} (e.g. /rental/car/delhi), is
// permanently redirected here so existing links and indexed URLs keep working.

const getVehicleTypeBySlug = async (slug: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/slug/${slug}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) {
    // Any failure (genuine 404 or a transient backend blip) routes through
    // the same `!typeData -> notFound()` handling the page already has
    // below, instead of throwing and crashing the entire static build.
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

// Admin "City + Type Page" for this location + type, or null (none / inactive)
const getCityPage = async (locationId: string, typeId: string) => {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/rental-city-page/lookup?location=${locationId}&type=${typeId}`,
      { next: { revalidate: 60 } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data ?? null;
  } catch {
    return null;
  }
};

interface ListedVehicle {
  vehicleType?: string;
  location?: { _id?: string };
}

// Same match RentalsClient applies for this page's initial filter
const countVehicles = (vehicles: ListedVehicle[], locationId: string, typeName: string) =>
  (vehicles ?? []).filter(
    (v) =>
      v.location?._id === locationId &&
      v.vehicleType?.toLowerCase() === typeName.toLowerCase(),
  ).length;

// Heading used when no city page has been written yet
const autoHeading = (typeName: string, cityName: string) => `${typeName} Rental in ${cityName}`;

// True when the URL is in the old /rental/{type}/{location} order
const isLegacyOrder = async (first: string, second: string) => {
  const [typeData, destData] = await Promise.all([
    getVehicleTypeBySlug(first),
    getDestinationBySlug(second),
  ]);
  return Boolean(typeData && destData);
};

export async function generateMetadata({ params }: { params: Promise<{ location: string, vehicleType: string }> }): Promise<Metadata> {
  const { location, vehicleType } = await params;
  const [destData, typeData, vehicles] = await Promise.all([
    getDestinationBySlug(location),
    getVehicleTypeBySlug(vehicleType),
    getAllVehicles(),
  ]);

  // Old-order URLs redirect in the page below; no metadata needed for them
  if (!destData || !typeData) return { title: "Not Found" };

  const cityPage = await getCityPage(destData._id, typeData._id);

  // destData.canonicalUrl is a single admin-set field on the pickup
  // destination itself (e.g. "Delhi"), shared across every vehicle type --
  // it has no way to encode which vehicleType this specific page is for, so
  // it can never be a correct canonical here (it was making /rental/car/delhi
  // and /rental/traveller/delhi both canonicalize to the same /rental/delhi).
  // This page always self-references its own real URL instead. Unaffected:
  // every other route reading a canonicalUrl (blog/news/webpage/visa/the
  // sibling rental/[location] page) reads it from its own entity's own field,
  // not this shared destination record.
  const url = `https://musafirbaba.com/rental/${location}/${vehicleType}`;

  // Own title/description per location + type (from the city page, else
  // generated) -- no longer the location's, which every type page repeated
  const heading = autoHeading(typeData.name, destData.name);
  const typeLower = typeData.name.toLowerCase();

  // Nothing to show yet (no city page and no vehicles): keep it out of search
  // results until it has content; links on it are still followed
  const isEmpty = !cityPage && countVehicles(vehicles, destData._id, typeData.name) === 0;

  return {
    title: cityPage?.metaTitle || cityPage?.title || `${heading} - MusafirBaba`,
    description:
      cityPage?.metaDescription ||
      `Rent a ${typeLower} in ${destData.name} with MusafirBaba. Compare ${typeLower} options and daily prices, and book online.`,
    keywords: cityPage?.keywords?.length ? cityPage.keywords.join(", ") : undefined,
    alternates: {
      canonical: url,
    },
    ...(isEmpty ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ location: string, vehicleType: string }> }) {
  const { location, vehicleType } = await params;

  const [typeData, destData, vehicles] = await Promise.all([
    getVehicleTypeBySlug(vehicleType),
    getDestinationBySlug(location),
    getAllVehicles()
  ]);

  if (!typeData || !destData) {
    if (await isLegacyOrder(location, vehicleType)) {
      permanentRedirect(`/rental/${vehicleType}/${location}`);
    }
    notFound();
  }

  const cityPage = await getCityPage(destData._id, typeData._id);

  return (
    <main>
      <Hero
        image={cityPage?.bannerImage?.url || destData.bannerImage?.url || typeData.bannerImage?.url || "/assets/images/cars/car-banner.png"}
        title={cityPage?.title || autoHeading(typeData.name, destData.name)}
      />
      <div className="max-w-7xl mx-auto">
        {/* Last crumb is the type segment in /rental/{location}/{type} */}
        <Breadcrumb title={typeData.name} />

        {/* Only this page's own text (the location's text stays on /rental/{location}) */}
        {cityPage?.content && (
          <div className="mx-4 md:mx-6 lg:mx-8 mt-6 mb-10">
            <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
              <ReadMore content={cityPage.content} />
            </section>
          </div>
        )}
      </div>

      <RentalsClient
        vehicles={vehicles}
        initialVehicleType={typeData.name.toLowerCase()}
        initialLocationId={destData._id}
      />

      <PageFaqs faqs={cityPage?.faqs} />
    </main>
  );
}
