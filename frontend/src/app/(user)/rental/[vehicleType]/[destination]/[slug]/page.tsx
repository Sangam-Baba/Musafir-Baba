import { notFound } from "next/navigation";
import RentalPageClient from "./pageClient";

export interface IVehicleUserData {
  _id: string;
  vehicleName: string;
  slug: string;
  location: {
    _id: string;
    name: string;
    state: string;
    country: string;
  };
  vehicleType: string;
  vehicleYear: string;
  vehicleBrand: string;
  vehicleMilage?: string;
  fuelType: string;
  tripProtectionFee: number;
  convenienceFee: number;
  vehicleTransmission: string;
  price: {
    daily: number;
    hourly: number;
  };
  seatingOptions?: {
    seats: number;
    dailyPrice: number;
    hourlyPrice: number;
  }[];
  pricingType?: "single" | "multiple";
  title: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  vehicleModel?: string;
  gallery: {
    url: string;
    title?: string;
    alt: string;
  }[];
  faqs: {
    question: string;
    answer: string;
  }[];
  features: string[];
  inclusions: string[];
  exclusions: string[];
  vehicleAtAGlance?: string;
  quickAnswers?: string;
  availableFor?: string;
  rentalOptions?: string;
  howBookingWorks?: string;
  helpfulResources?: { title: string; url: string; }[];
  status: string;
  availableStock: number;
}

const getVehicleBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/slug/${slug}`,
  );
  if (!res.ok) {
    // A failure here (genuine 404 or a transient backend blip) now routes
    // through notFound() below instead of throwing and crashing the entire
    // static build.
    if (res.status !== 404) console.error("Failed to fetch vehicle:", res.status);
    return null;
  }
  const data = await res.json();
  return data?.data;
};

const getRelatedVehicles = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/related/${slug}`,
  );

  if (!res.ok) {
    console.error("Failed to fetch related vehicles:", res.status);
    return [];
  }
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata({ params }: { params: Promise<{ vehicleType: string, destination: string, slug: string }> }) {
  const { vehicleType, destination, slug } = await params;
  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) return { title: "Not Found" };

  const url = vehicle.canonicalUrl 
    ? `https://musafirbaba.com${vehicle.canonicalUrl}`
    : `https://musafirbaba.com/rental/${vehicleType}/${destination}/${slug}`;

  return {
    title: vehicle.metaTitle || `${vehicle.title || vehicle.vehicleName} - MusafirBaba`,
    description: vehicle.metaDescription || vehicle.excerpt || `Rent ${vehicle.vehicleName} easily with MusafirBaba.`,
    keywords: vehicle.keywords?.join(", "),
    alternates: {
      canonical: url,
    },
  };
}

async function page({ params }: { params: Promise<{ vehicleType: string, destination: string, slug: string }> }) {
  const { slug } = await params;
  const relatedVehicles = await getRelatedVehicles(slug);

  const vehicle = await getVehicleBySlug(slug);

  if (!vehicle) {
    notFound();
  }

  return (
    <RentalPageClient vehicle={vehicle} relatedVehicles={relatedVehicles} />
  );
}

export default page;
