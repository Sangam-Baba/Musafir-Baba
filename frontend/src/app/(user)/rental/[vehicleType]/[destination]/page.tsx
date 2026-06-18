import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import RentalsClient from "../../RentalsClient";
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

const getDestinationBySlug = async (slug: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/master-data/pickup-destination/slug/${slug}`, {
    next: { revalidate: 60 }
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch destination");
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

export async function generateMetadata({ params }: { params: Promise<{ vehicleType: string, destination: string }> }): Promise<Metadata> {
  const { vehicleType, destination } = await params;
  const destData = await getDestinationBySlug(destination);

  if (!destData) return { title: "Not Found" };

  return {
    title: destData.metaTitle || `${destData.title || destData.name} Rentals - MusafirBaba`,
    description: destData.metaDescription || `Rent vehicles in ${destData.name} easily with MusafirBaba.`,
    keywords: destData.keywords?.join(", "),
  };
}

export default async function DestinationPage({ params }: { params: Promise<{ vehicleType: string, destination: string }> }) {
  const { vehicleType, destination } = await params;
  
  const [typeData, destData, vehicles] = await Promise.all([
    getVehicleTypeBySlug(vehicleType),
    getDestinationBySlug(destination),
    getAllVehicles()
  ]);

  if (!typeData || !destData) {
    notFound();
  }

  return (
    <main>
      <Hero
        image={destData.bannerImage?.url || typeData.bannerImage?.url || "/assets/images/cars/car-banner.png"}
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

      <RentalsClient 
        vehicles={vehicles} 
        initialVehicleType={typeData.name.toLowerCase()} 
        initialLocationId={destData._id}
      />
    </main>
  );
}
