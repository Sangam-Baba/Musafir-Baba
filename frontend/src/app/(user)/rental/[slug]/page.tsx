import RentalPageClient from "./pageClient";

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

  return <RentalPageClient vehicle={vehicle} />;
}

export default page;
