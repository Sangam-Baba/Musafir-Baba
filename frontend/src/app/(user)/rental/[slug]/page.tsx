import Breadcrumb from "@/components/common/Breadcrumb";
import RentalCarousal from "@/components/common/RentalCarousal";
import { Faqs } from "@/components/custom/Faqs";
import React from "react";

const getVehicleBySlug = async (slug: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/slug/${slug}`,
  );
  if (!res.ok) throw new Error("Failed to fetch vehicle");
  const data = await res.json();
  return data?.data;
};

async function page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = await getVehicleBySlug(slug);
  return (
    <div>
      <RentalCarousal gallery={vehicle?.gallery} />
      <div className="max-w-7xl mx-auto">
        <Breadcrumb />
      </div>
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold">{vehicle?.vehicleName}</h1>

        <Faqs faqs={vehicle?.faqs} />
      </div>
    </div>
  );
}

export default page;
