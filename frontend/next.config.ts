import type { NextConfig } from "next";


/** @type {import('next').NextConfig} */
const nextConfig: NextConfig  = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig