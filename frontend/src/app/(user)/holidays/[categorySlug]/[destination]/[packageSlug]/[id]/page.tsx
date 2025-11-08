import BookingClient from "@/components/custom/BookingClient";
import { notFound } from "next/navigation";

type Params = {
  params: { destination: string; packageSlug: string; id: string };
};

export default async function Page({ params }: Params) {
  const { destination, packageSlug } = params;
  const decodedCountry = decodeURIComponent(destination || "");

  // fetch package server-side (SSR)
  const res = await fetch(
    `${
      process.env.NEXT_PUBLIC_BASE_URL
    }/packages/?destination=${encodeURIComponent(
      decodedCountry
    )}&slug=${encodeURIComponent(packageSlug)}`,
    { next: { revalidate: 60 } }
  );

  if (!res.ok) {
    return notFound();
  }

  const json = await res.json();
  const pkg = json?.data?.[0] ?? null;

  if (!pkg) {
    return notFound();
  }

  return <BookingClient pkg={pkg} />;
}
