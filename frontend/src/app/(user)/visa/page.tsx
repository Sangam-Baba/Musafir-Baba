import { Metadata } from "next";
import VisaClientPage from "./visaClient";

export const metadata: Metadata = {
  title: "Visa Services You Can Trust | Expert Guidance | Musafirbaba",
  description:
    "Need visa help? Musafirbaba offers smooth processing for tourist, work & business visa. Quick, reliable service for Schengen, USA, UK & More.",
  alternates: {
    canonical: "https://musafirbaba.com/visa",
  },
};
export const getVisa = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/visa`, {
    next: {
      revalidate: 60,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch visas");
  const data = await res.json();
  return data?.data; // []
};

export default async function VisaMainPage() {
  const visa = await getVisa();
  return <VisaClientPage visa={visa} />;
}
