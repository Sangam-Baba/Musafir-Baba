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

export default function VisaMainPage() {
  return <VisaClientPage />;
}
