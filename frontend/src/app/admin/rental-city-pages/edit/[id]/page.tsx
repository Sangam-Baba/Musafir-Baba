import { CreateEditRentalCityPage } from "@/components/admin/CreateEditRentalCityPage";

export default async function EditRentalCityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <div>
      <CreateEditRentalCityPage id={id} />
    </div>
  );
}
