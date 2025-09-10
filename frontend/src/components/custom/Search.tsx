"use client"

import { Button } from "../ui/button"
import { MapPin } from "lucide-react"
import { useRouter } from "next/navigation"
import React, { useState } from "react"

function Search() {
  const [location, setLocation] = useState("")
  const router = useRouter()

  const handleSearch = () => {
    if (!location) return
    router.push(`/india/${location}`)
  }

  return (
    <section className="border rounded-3xl shadow-lg flex gap-4 w-full max-w-xl mx-auto px-4 py-3 items-center bg-white justify-between">
      <MapPin className="text-[#FE5300]" />
      <select
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-3/2 border border-[#FE5300] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#FE5300]"
      >
        <option value="">Select Location</option>
        <option value="delhi">Delhi</option>
        <option value="mumbai">Mumbai</option>
        <option value="kolkata">Kolkata</option>
        <option value="chennai">Chennai</option>
        <option value="bangalore">Bangalore</option>
      </select>
      <Button
        onClick={handleSearch}
        disabled={!location}
        className="bg-[#FE5300] hover:bg-[#e04a00] text-white rounded-md"
      >
        Search
      </Button>
    </section>
  )
}


export default Search

