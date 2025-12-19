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
  const decodedCountry = decodeURIComponent(destination || "");

  const res = await getGroupPackageById(id);
  // if(!res) return notFound();
  // // fetch package server-side (SSR)
  // const res = await fetch(
  //   `${
  //     process.env.NEXT_PUBLIC_BASE_URL
  //   }/packages/?destination=${encodeURIComponent(
  //     decodedCountry
  //   )}&slug=${encodeURIComponent(packageSlug)}`,
  //   { next: { revalidate: 60 } }
  // );

  // if (!res.ok) {
  //   return notFound();
  // }

  // const json = await res.json();
  const pkg = res?.data;

  if (!pkg) {
    return notFound();
  }

  return <BookingClient pkg={pkg} />;
}
