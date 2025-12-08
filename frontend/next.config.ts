import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  // browsersListForSwc: true,
  productionBrowserSourceMaps: false,
  images: {
    minimumCacheTTL: 31536000, // 1 year
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        port: "",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // swcMinify: true,
  // browserslist: {
  //   production: [">0.3%", "not dead", "not op_mini all", "not IE 11"],
  //   development: [
  //     "last 1 chrome version",
  //     "last 1 firefox version",
  //     "last 1 safari version",
  //   ],
  // },
  async redirects() {
    return [
      {
        source: "/customized-tour-package/delhi-tour-packages",
        destination: "/holidays/customised-tour-packages/delhi",
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
