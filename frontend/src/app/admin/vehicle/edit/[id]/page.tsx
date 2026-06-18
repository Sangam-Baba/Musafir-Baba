"use client";

import { CreateEditVehicle } from "@/components/admin/CreateEditVehicle";
import { useRouter, useParams } from "next/navigation";

export default function EditVehiclePage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <CreateEditVehicle id={id} onClose={() => router.push("/admin/vehicle")} />
    </div>
  );
}
