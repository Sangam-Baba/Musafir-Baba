import { CreateEditVehicleType } from "@/components/admin/CreateEditVehicleType";

export default async function EditVehicleTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <CreateEditVehicleType id={id} />
    </div>
  );
}
