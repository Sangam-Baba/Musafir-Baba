import { CreateEditRentalSpecialPage } from "@/components/admin/CreateEditRentalSpecialPage";

export default async function EditRentalSpecialPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <CreateEditRentalSpecialPage id={id} />
    </div>
  );
}
