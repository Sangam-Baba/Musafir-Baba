import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import RentalsClient from "../RentalsClient";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import ReadMore from "@/components/common/ReadMore";

const getVehicleTypeBySlug = async (slug: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/type/slug/${slug}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch vehicle type");
  }
  const data = await res.json();
  return data?.data;
};

const getAllVehicles = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/all`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) throw new Error("Failed to fetch Vehicles");
  const data = await res.json();
  return data?.data;
};

export async function generateMetadata({ params }: { params: Promise<{ vehicleType: string }> }): Promise<Metadata> {
  const { vehicleType } = await params;
  const typeData = await getVehicleTypeBySlug(vehicleType);

  if (!typeData) return { title: "Not Found" };

  const url = typeData.canonicalUrl 
    ? `https://musafirbaba.com${typeData.canonicalUrl}`
    : `https://musafirbaba.com/rental/${vehicleType}`;

  return {
    title: typeData.metaTitle || `${typeData.name} Rentals - MusafirBaba`,
    description: typeData.metaDescription || `Rent ${typeData.name} easily with MusafirBaba.`,
    keywords: typeData.keywords?.join(", "),
    alternates: {
      canonical: url,
    },
  };
}

export default async function VehicleTypePage({ params }: { params: Promise<{ vehicleType: string }> }) {
  const { vehicleType } = await params;
  
  const [typeData, vehicles] = await Promise.all([
    getVehicleTypeBySlug(vehicleType),
    getAllVehicles()
  ]);

  if (!typeData) {
    notFound();
  }

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
