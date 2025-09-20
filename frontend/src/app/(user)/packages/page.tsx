import PackagesClient from "./PackagesClient"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Affordable Holiday Tour Packages - Domestic & International | Book Now",
  description:
    "Explore incredible tour package without breaking the bank. Our affordable tour packages cover domestic and international trips. Easy booking and 24/7 support included.",
  alternates: {
    canonical: "https://www.musafirbaba.com/packages",
  },
}

export default function PackagesPage() {
  return <PackagesClient />
}
