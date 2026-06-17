import { CreateEditVehicleType } from "@/components/admin/CreateEditVehicleType";

export default async function EditVehicleTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-5xl mx-auto p-6">
      <CreateEditVehicleType id={id} />
    </div>
  );
}
