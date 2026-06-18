"use client";

import { CreateEditVehicle } from "@/components/admin/CreateEditVehicle";
import { useRouter } from "next/navigation";

export default function NewVehiclePage() {
  const router = useRouter();

  return (
    <div className="max-w-5xl mx-auto p-6">
      <CreateEditVehicle id={null} onClose={() => router.push("/admin/vehicle")} />
    </div>
  );
}
