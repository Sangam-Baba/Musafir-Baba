import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // browsersListForSwc: true,
  productionBrowserSourceMaps: false,
  images: {
    minimumCacheTTL: 31536000, // 1 year (good)
    formats: ["image/avif", "image/webp"],

    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.musafirbaba.com",
        pathname: "/**",
      },

      // 🔁 TEMPORARY — keep until full migration done
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  async redirects() {
    return [
      {
        source: "/blog/schengen-joint-visa-centre-relocates-in-delhi",
        destination: "/news/schengen-joint-visa-centre-relocates-in-delhi",
        permanent: true,
      },
      {
        source:
          "/blog/4000-crore-push-meghalaya-bets-big-on-240-tourism-projects",
        destination:
          "/news/4000-crore-push-meghalaya-bets-big-on-240-tourism-projects",
        permanent: true,
      },
      {
        source:
          "/blog/varanasi-transformation-cleaner-ghats-tourism-surge-and-local-impact",
        destination:
          "/news/varanasi-transformation-cleaner-ghats-tourism-surge-and-local-impact",
        permanent: true,
      },
      {
        source:
          "/blog/3834-pilgrims-in-40-days-winter-char-dham-yatra-puts-uttarakhand-in-the-spotlight",
        destination:
          "/news/3834-pilgrims-in-40-days-winter-char-dham-yatra-puts-uttarakhand-in-the-spotlight",
        permanent: true,
      },
      {
        source:
          "/blog/bengaluru-jumps-into-worlds-top-30-how-indias-tech-capital-hit-rank-29",
        destination:
          "/news/bengaluru-jumps-into-worlds-top-30-how-indias-tech-capital-hit-rank-29",
        permanent: true,
      },
      {
        source:
          "/blog/clean-air-picks-indian-travel-destinations-reporting-aqi-below-50-right-now",
        destination:
          "/news/clean-air-picks-indian-travel-destinations-reporting-aqi-below-50-right-now",
        permanent: true,
      },
      {
        source:
          "/blog/egypt-visa-fees-stay-the-same-as-officials-shut-down-rumours",
        destination:
          "/news/egypt-visa-fees-stay-the-same-as-officials-shut-down-rumours",
        permanent: true,
      },
      {
        source:
          "/blog/faster-slots-fewer-delays-us-visa-waits-fall-for-indians",
        destination:
          "/news/faster-slots-fewer-delays-us-visa-waits-fall-for-indians",
        permanent: true,
      },
      {
        source: "/blog/gcc-tourist-visa-2025-launch",
        destination: "/news/gcc-tourist-visa-2025-launch",
        permanent: true,
      },
      {
        source: "/blog/india-tops-asias-8-big-wins-at-world-travel-awards-2025",
        destination:
          "/news/india-tops-asias-8-big-wins-at-world-travel-awards-2025",
        permanent: true,
      },
      {
        source:
          "/blog/india-tourism-rankings-2024-2025-uttar-pradesh-tops-indias-most-visited-states-list",
        destination:
          "/news/india-tourism-rankings-2024-2025-uttar-pradesh-tops-indias-most-visited-states-list",
        permanent: true,
      },
      {
        source: "/blog/indian-techie-denied-us-tourist-visa",
        destination: "/news/indian-techie-denied-us-tourist-visa",
        permanent: true,
      },
      {
        source:
          "/blog/indian-tourist-can-now-visit-sikkim-historic-battlefield",
        destination:
          "/news/indian-tourist-can-now-visit-sikkim-historic-battlefield",
        permanent: true,
      },
      {
        source:
          "/blog/indian-tourists-rush-to-moscow-vietnam-japan-and-south-korea-as-visa-rules-ease",
        destination:
          "/news/indian-tourists-rush-to-moscow-vietnam-japan-and-south-korea-as-visa-rules-ease",
        permanent: true,
      },
      {
        source: "/blog/indias-first-bullet-train-to-launch-on-august-15-2027",
        destination:
          "/news/indias-first-bullet-train-to-launch-on-august-15-2027",
        permanent: true,
      },
      {
        source:
          "/blog/japan-to-raise-visa-fees-for-first-time-in-nearly-50-years",
        destination:
          "/news/japan-to-raise-visa-fees-for-first-time-in-nearly-50-years",
        permanent: true,
      },
      {
        source:
          "/blog/keralas-hidden-waterfall-temple-a-new-must-visit-for-nature-and-spiritual-travellers",
        destination:
          "/news/keralas-hidden-waterfall-temple-a-new-must-visit-for-nature-and-spiritual-travellers",
        permanent: true,
      },
      {
        source:
          "/blog/madhya-pradesh-named-in-global-50-best-places-to-travel-in-2026-tiger-state-goes-world-class",
        destination:
          "/news/madhya-pradesh-named-in-global-50-best-places-to-travel-in-2026-tiger-state-goes-world-class",
        permanent: true,
      },
      {
        source:
          "/blog/mattur-village-in-karnataka-continues-a-rare-sanskrit-tradition",
        destination:
          "/news/mattur-village-in-karnataka-continues-a-rare-sanskrit-tradition",
        permanent: true,
      },
      {
        source:
          "/blog/new-zealand-golden-visa-new-four-year-route-for-business-owners",
        destination:
          "/news/new-zealand-golden-visa-new-four-year-route-for-business-owners",
        permanent: true,
      },
      {
        source:
          "/blog/nongpoh-set-to-host-indias-first-integrated-textile-tourism-centre",
        destination:
          "/news/nongpoh-set-to-host-indias-first-integrated-textile-tourism-centre",
        permanent: true,
      },
      {
        source:
          "/blog/planning-your-trip-for-tirupati-vaikuntha-darshan-2025-dates-tickets-stay-and-safety",
        destination:
          "/news/planning-your-trip-for-tirupati-vaikuntha-darshan-2025-dates-tickets-stay-and-safety",
        permanent: true,
      },
      {
        source:
          "/blog/russia-visa-new-skilled-worker-route-that-offers-up-to-3-years-residency",
        destination:
          "/news/russia-visa-new-skilled-worker-route-that-offers-up-to-3-years-residency",
        permanent: true,
      },
      {
        source:
          "/blog/saudi-arabia-unveils-instant-e-visa-platform-what-indian-travellers-need-to-know",
        destination:
          "/news/saudi-arabia-unveils-instant-e-visa-platform-what-indian-travellers-need-to-know",
        permanent: true,
      },
      {
        source:
          "/blog/south-korea-extends-visa-fee-waiver-for-group-tourists-from-india-and-5-other-countries-until-june-2026",
        destination:
          "/news/south-korea-extends-visa-fee-waiver-for-group-tourists-from-india-and-5-other-countries-until-june-2026",
        permanent: true,
      },
      {
        source: "/blog/spiti-valley-first-cold-desert-biosphere-reserve-india",
        destination:
          "/news/spiti-valley-first-cold-desert-biosphere-reserve-india",
        permanent: true,
      },
      {
        source: "/blog/sri-lanka-removes-eta-requirements-for-tourists",
        destination: "/news/sri-lanka-removes-eta-requirements-for-tourists",
        permanent: true,
      },
      {
        source:
          "/blog/thailand-tightens-entry-rules-and-goes-digital-to-improve-visitor-quality",
        destination:
          "/news/thailand-tightens-entry-rules-and-goes-digital-to-improve-visitor-quality",
        permanent: true,
      },
      {
        source:
          "/blog/tourists-continue-to-visit-north-bengal-despite-heavy-weather-disruptions",
        destination:
          "/news/tourists-continue-to-visit-north-bengal-despite-heavy-weather-disruptions",
        permanent: true,
      },
      {
        source:
          "/blog/traffic-curbs-in-tura-for-megong-festival-2025-routes-dates-key-alerts",
        destination:
          "/news/traffic-curbs-in-tura-for-megong-festival-2025-routes-dates-key-alerts",
        permanent: true,
      },
      {
        source:
          "/blog/un-tourism-reveals-worlds-best-tourism-villages-2025-52-destinations-honoured-india-misses-out",
        destination:
          "/news/un-tourism-reveals-worlds-best-tourism-villages-2025-52-destinations-honoured-india-misses-out",
        permanent: true,
      },
      {
        source:
          "/blog/vietnam-tops-asia-dubai-shines-in-uae-as-10-travel-hotspots-in-2025",
        destination:
          "/news/vietnam-tops-asia-dubai-shines-in-uae-as-10-travel-hotspots-in-2025",
        permanent: true,
      },
      {
        source:
          "/blog/west-bengal-becomes-indias-new-no2-tourist-hotspot-for-foreign-visitors",
        destination:
          "/news/west-bengal-becomes-indias-new-no2-tourist-hotspot-for-foreign-visitors",
        permanent: true,
      },
      {
        source:
          "/blog/where-is-pawna-lake-inside-ayushmann-khurranas-new-family-style-escape-near-mumbai",
        destination:
          "/blog/where-is-pawna-lake-inside-ayushmann-khurranas-new-family-style-escape-near-mumbai",
        permanent: true,
      },
      {
        source:
          "/blog/youtube-now-guides-indian-trip-plans-video-first-holidays-says-google-report",
        destination:
          "/news/youtube-now-guides-indian-trip-plans-video-first-holidays-says-google-report",
        permanent: true,
      },
      {
        source:
          "/holidays/honeymoon-packages/indonesia/bali-honeymoon-escape-6n-7d",
        destination:
          "/holidays/honeymoon-packages/indonesia/bali-honeymoon-package",
        permanent: true,
      },
      {
        source: "/india/uttarakhand/tungnath-chandrashila-trek-2n-3d",
        destination:
          "/holidays/mountain-treks/uttarakhand/tungnath-chandrashila-trek-2n-3d",
        permanent: true,
      },
      {
        source: "/india/uttarakhand/rishikesh-dehradun-mussoorie-tour",
        destination:
          "/holidays/weekend-getaways/uttarakhand/rishikesh-dehradun-mussoorie-tour",
        permanent: true,
      },
      {
        source:
          "/holidays/honeymoon-packages/maldives/maldives-romantic-escape",
        destination:
          "/holidays/honeymoon-packages/maldives/maldives-honeymoon-package",
        permanent: true,
      },
      {
        source:
          "/holidays/group-tour-packages/sikkim/darjeeling-gangtok-pelling-and-north-sikkim-expedition",
        destination:
          "/holidays/group-tour-packages/sikkim/darjeeling-gangtok-pelling-north-sikkim-trip",
        permanent: true,
      },
      {
        source: "/customized-tour-package/delhi-tour-packages",
        destination: "/holidays/customised-tour-packages/delhi",
        permanent: true,
      },
      {
        source: "/holidays/weekend-getaway",
        destination: "/holidays/weekend-getaways",
        permanent: true,
      },
      {
        source: "/about",
        destination: "/about-us",
        permanent: true,
      },
      {
        source: "/family-tour",
        destination: "/holidays/family-tours",
        permanent: true,
      },
      {
        source: "/honeymoon-packages",
        destination: "/holidays/honeymoon-package",
        permanent: true,
      },
      {
        source: "/customised-tour-packages",
        destination: "/holidays/customized-tour-package",
        permanent: true,
      },
      {
        source: "/group-tour-packages",
        destination: "/holidays/group-tour-packages",
        permanent: true,
      },
      {
        source: "/solo-trip",
        destination: "/holidays/solo-tour-packages",
        permanent: true,
      },
      {
        source: "/weekend-getaways",
        destination: "/holidays/weekend-getaway",
        permanent: true,
      },
      {
        source: "/backpacking-trips",
        destination: "/holidays/backpacking-trips",
        permanent: true,
      },
      {
        source: "/corporate-tour-packages",
        destination: "/holidays/corporate-tour-package",
        permanent: true,
      },
      {
        source: "/contact",
        destination: "/contact-us",
        permanent: true,
      },
      {
        source: "/delhi-darshan",
        destination: "/customized-tour-package/delhi-tour-packages",
        permanent: true,
      },
      {
        source: "/hotels",
        destination: "/bookings/hotel-bookings",
        permanent: true,
      },
      {
        source: "/japan-visa",
        destination: "/visa/japan-visa",
        permanent: true,
      },
      {
        source: "/leh-ladakh-tour-packages",
        destination: "/india/ladakh",
        permanent: true,
      },
      {
        source: "/schengen-visa",
        destination: "/visa/schengen-visa",
        permanent: true,
      },
      {
        source: "/shimla-manali-tour-package",
        destination: "/visa/singapore-visa",
        permanent: true,
      },
      {
        source: "/ticket-booking",
        destination: "/bookings",
        permanent: true,
      },
      {
        source: "/tour-packages",
        destination: "/holidays",
        permanent: true,
      },
      {
        source: "/us-visa-appointment",
        destination: "/visa/us-visa",
        permanent: true,
      },
      {
        source: "/singapore-visa-for-indians",
        destination: "/visa/singapore-visa",
        permanent: true,
      },
      {
        source: "/japan-visa",
        destination: "/visa/japan-visa",
        permanent: true,
      },
      {
        source: "/bus",
        destination: "/bookings/bus-bookings",
        permanent: true,
      },
      {
        source: "/holidays/group-tour-package",
        destination: "/holidays/group-tour-packages",
        permanent: true,
      },
      {
        source: "/us-visa-appointment",
        destination: "/visa/us-visa",
        permanent: true,
      },
      {
        source: "/tour-packages",
        destination: "/holidays",
        permanent: true,
      },
      {
        source: "/us-visa-appointment",
        destination: "/visa/us-visa",
        permanent: true,
      },
    ];
  },
};

module.exports = nextConfig;
