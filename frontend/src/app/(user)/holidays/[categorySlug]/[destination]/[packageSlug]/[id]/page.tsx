import BookingClient from "@/components/custom/BookingClient";
import { notFound } from "next/navigation";

type Params = {
  params: Promise<{ destination: string; packageSlug: string; id: string }>;
};

export const getGroupPackageById = async (id: string) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/id/${id}`
  );
  if (!res.ok) return null;
  return res.json();
};

export default async function Page({ params }: Params) {
  const { destination, packageSlug, id } = await params;

  const res = await getGroupPackageById(id);
  const pkg = res?.data;

  if (!res) {
    return notFound();
  }

  return <BookingClient pkg={pkg} />;
}
