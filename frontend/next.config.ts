import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig: NextConfig = {
  images: {
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
  swcMinify: true,
  browserslist: {
    production: [">0.3%", "not dead", "not op_mini all", "not IE 11"],
    development: [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version",
    ],
  },
};

module.exports = nextConfig;
