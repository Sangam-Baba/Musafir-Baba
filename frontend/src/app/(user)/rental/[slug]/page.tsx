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
  vehicleTransmission: "mannual" | "automatic";
  price: {
    daily: number;
    hourly: number;
  };
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
  status: string;
}

const getVehicleBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/slug/${slug}`,
  );
  if (!res.ok) throw new Error("Failed to fetch vehicle");
  const data = await res.json();
  return data?.data;
};

const getRelatedVehicles = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/related/${slug}`,
  );

  if (!res.ok) throw new Error("Failed to fetch related vehicles");
  const data = await res.json();
  return data?.data;
};

async function page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const relatedVehicles = await getRelatedVehicles(slug);

  const vehicle = await getVehicleBySlug(slug);

  return (
    <RentalPageClient vehicle={vehicle} relatedVehicles={relatedVehicles} />
  );
}

export default page;
