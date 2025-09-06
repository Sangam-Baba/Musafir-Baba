"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"
import Image from "next/image"
import jaipur from '../../../public/jaipur.jpg'
import badrinath from '../../../public/badrinath.jpg'
import keral from '../../../public/keral.jpg'
import kashmir from '../../../public/kashmir.jpg'
import himachal from '../../../public/Himachal.jpg'

export function DestinationSection() {
  const [active, setActive] = useState<"domestic" | "international">("domestic")

  return (
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="flex flex-col gap-2 items-center max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex flex-col gap-5 items-center w-full">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            Not Sure Where to Travel? Explore Top Destinations Across India & the World!
          </h1>
          <div className="w-20 h-1 bg-[#FE5300]"></div>
          <div className="flex gap-4">
            <Button
              size="lg"
              onClick={() => setActive("domestic")}
              className={`mt-4 ${
                active === "domestic" ? "bg-[#FE5300]" : "bg-gray-400"
              }`}
            >
              Domestic Trips
            </Button>
            <Button
              size="lg"
              onClick={() => setActive("international")}
              className={`mt-4 ${
                active === "international" ? "bg-[#FE5300]" : "bg-gray-400"
              }`}
            >
              International Trips
            </Button>
          </div>
        </div>

        {/* Content Section */}
        {active === "domestic" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                 <Image src={badrinath} alt="Uttarakhand" className="rounded-2xl w-full h-56 object-cover" />
                 <Image src={jaipur} alt="Rajasthan" className="rounded-2xl w-full h-56 object-cover" />
              </div>
              <div className="md:w-1/2">
                 <Image src={keral} alt="Kerala" className="rounded-2xl w-full md:h-118 object-cover" />
              </div>    
            </div>    
            <div className="flex flex-col gap-4 md:w-1/2">
             <div className="w-full">
                 <Image src={badrinath} alt="Uttarakhand" className="rounded-2xl w-full h-56 object-cover" />
             </div>
             <div className="md:flex  gap-4 w-full">
                 <Image src={himachal} alt="Rajasthan" className="rounded-2xl md:w-1/2 h-56 object-cover" />
                 <Image src={kashmir} alt="Kerala" className="rounded-2xl md:w-1/2 h-56 object-cover" />
             </div>
             
             
            </div>
          </div>
        )}

        {active === "international" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                 <Image src={badrinath} alt="Uttarakhand" className="rounded-2xl w-full h-56 object-cover" />
                 <Image src={jaipur} alt="Rajasthan" className="rounded-2xl w-full h-56 object-cover" />
              </div>
              <div className="md:w-1/2">
                 <Image src={keral} alt="Kerala" className="rounded-2xl w-full md:h-118 object-cover" />
              </div>    
            </div>    
            <div className="flex flex-col gap-4 md:w-1/2">
             <div className="w-full">
                 <Image src={badrinath} alt="Uttarakhand" className="rounded-2xl w-full h-56 object-cover" />
             </div>
             <div className="md:flex  gap-4 w-full">
                 <Image src={jaipur} alt="Rajasthan" className="rounded-2xl md:w-1/2 h-56 object-cover" />
                 <Image src={keral} alt="Kerala" className="rounded-2xl md:w-1/2 h-56 object-cover" />
             </div>
             
             
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
