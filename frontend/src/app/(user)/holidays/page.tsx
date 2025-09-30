import PackagesClient from "./PackagesClient"
import { Metadata } from "next"
import Script from "next/script"

export const metadata: Metadata = {
  title: "Affordable Holiday Tour Packages - Domestic & International | Book Now",
  description:
    "Explore incredible tour package without breaking the bank. Our affordable tour packages cover domestic and international trips. Easy booking and 24/7 support included.",
  alternates: {
    canonical: "https://www.musafirbaba.com/holidays",
  },
}

export default function PackagesPage() {

 const schema = {
  "@context": "https://schema.org",
  "@type": "TouristTrip",
  "name": "Meghalaya Tour Package 2N/3D - Shillong, Cherrapunji, Dawki & More",
  "description": "Book our 2 Nights/3 Days Meghalaya Tour Package. Explore Shillong, Cherrapunji, Dawki & Mawlynnong with scenic waterfalls, crystal rivers & vibrant culture.",
  "url": "https://musafirbaba.com/packages/meghalaya-tour-package-2n-3d",
  "image": "https://musafirbaba.com/images/packages/meghalaya-tour.jpg",
  "touristType": ["Families", "Friends", "Corporate Groups", "Solo Travellers"],
  "offers": {
    "@type": "Offer",
    "price": "15999",
    "priceCurrency": "INR",
    "availability": "https://schema.org/InStock",
    "validFrom": "2025-09-27",
    "url": "https://musafirbaba.com/packages/meghalaya-tour-package-2n-3d"
  },
  "itinerary": {
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Day 1: Arrival at Guwahati - Shillong Sightseeing",
        "description": "Visit Umiam Lake, explore Shillong's colonial charm and vibrant markets."
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Day 2: Cherrapunji - Dawki - Mawlynnong",
        "description": "Explore waterfalls, caves, the crystal-clear Umngot River and Asia’s cleanest village."
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Day 3: Shillong - Elephant Falls & Shillong Peak",
        "description": "Farewell to Meghalaya with panoramic views before departure to Guwahati."
      }
    ]
  },
  "provider": {
    "@type": "TravelAgency",
    "name": "Musafir Baba",
    "url": "https://musafirbaba.com",
    "logo": "https://musafirbaba.com/images/logo.png",
    "telephone": "+91-9876543210",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "1st Floor, Khaira Mor, Plot no. 2 & 3, near Dhansa Metro Station, Dindarpur Extension",
      "addressLocality": "New Delhi",
      "postalCode": "110043",
      "addressCountry": "IN"
    }
  }
}

  return <>
  <PackagesClient />
        {/* ✅ JSON-LD Schema */}
      <Script id="json-schema" type="application/ld+json">
        {JSON.stringify(schema)}
      </Script>
  </>
}
