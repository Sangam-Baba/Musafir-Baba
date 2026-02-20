import Breadcrumb from "@/components/common/Breadcrumb";
import Hero from "@/components/custom/Hero";
import VehicleCard from "@/components/custom/VehicleCard";
const getAllVehicles = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/all`);
  if (!res.ok) throw new Error("Failed to fetch Vehicles");
  const data = await res.json();
  return data?.data;
};

async function page() {
  const vehicles = await getAllVehicles();
  return (
    <div>
      <Hero title="Rental Services" image="/rent.jpeg" />

      <div className="max-w-7xl mx-auto">
        <Breadcrumb title="Rental Services" />
      </div>
      <div className="max-w-7xl mx-auto mt-10">
        {/* <h2 className="">Book Your Rental</h2> */}
        <div
          className="max-w-7xl mx-auto w-full px-4 md:px-6 lg:px-8
    flex gap-4 overflow-x-auto no-scrollbar
    md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4
    md:gap-6 md:overflow-visible"
        >
          {vehicles.map((vehicle: any) => {
            return (
              <VehicleCard
                key={vehicle._id}
                vehicle={{
                  coverImage: vehicle.gallery[0],
                  vehicleName: vehicle.vehicleName,
                  vehicleTransmission: vehicle.vehicleTransmission,
                  fuelType: vehicle.fuelType,
                  availableSeats: vehicle.seats,
                  price: vehicle.price,
                  vehicleBrand: vehicle.vehicleBrand,
                  vehicleYear: vehicle.vehicleYear,
                  url: `/rental/${vehicle.slug}`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default page;
