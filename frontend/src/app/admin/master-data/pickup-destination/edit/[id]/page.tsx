import { CreateEditPickupDestination } from "@/components/admin/CreateEditPickupDestination";

export default async function EditPickupDestinationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div className="max-w-6xl mx-auto p-6">
      <CreateEditPickupDestination id={id} />
    </div>
  );
}
