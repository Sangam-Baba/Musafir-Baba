import { CreateEditPickupDestination } from "@/components/admin/CreateEditPickupDestination";

export default async function EditPickupDestinationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <CreateEditPickupDestination id={id} />
    </div>
  );
}
