"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home } from "lucide-react"

export default function NotFoundPage() {
  return (
    <section className="flex flex-col items-center justify-center min-h-screen text-center px-6">
      <h1 className="text-7xl font-extrabold text-[#FE5300]">404</h1>
      <h2 className="mt-4 text-2xl md:text-3xl font-semibold">Page Not Found</h2>
      <p className="mt-2 text-gray-600 max-w-md">
        Oops! The page you’re looking for doesn’t exist or has been moved.
      </p>

      <div className="mt-6">
        <Link href="/">
          <Button className="flex items-center gap-2 bg-[#FE5300] hover:bg-[#e44900] text-white">
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
      </div>
    </section>
  )
}
