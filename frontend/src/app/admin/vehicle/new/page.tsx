"use client";

import { CreateEditVehicle } from "@/components/admin/CreateEditVehicle";
import { useRouter } from "next/navigation";

export default function NewVehiclePage() {
  const router = useRouter();

  return (
    <div>
      <CreateEditVehicle id={null} onClose={() => router.push("/admin/vehicle")} />
    </div>
  );
}
