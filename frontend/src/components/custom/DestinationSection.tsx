"use client"

import React, { useState } from "react"
import { Button } from "../ui/button"
import Image from "next/image"
import jaipur from '../../../public/jaipur.jpg'
import badrinath from '../../../public/badrinath.jpg'
import keral from '../../../public/keral.jpg'
import kashmir from '../../../public/kashmir.jpg'
import himachal from '../../../public/Himachal.jpg'
import Link from "next/link"
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
        <div className="flex  justify-between  items-center w-full p-2">
          <div className="text-xl font-semibold">{active==="domestic"?"Domestic":"International"} Trips</div>
          <div>
              <Link href={`https://musafirbaba.com/${active==="domestic"?"india":"international"}`} className="text-[#FE5300] font-semibold" > View All</Link>
          </div>
        </div>

        {/* Content Section */}
        {active === "domestic" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                 <div className="relative">
                  <Image src={badrinath} alt="Uttarakhand" className="rounded-2xl w-full h-56 object-cover" />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Uttarakhand
                  </div>
                 </div>
                 <div className="relative">
                  <Image src={jaipur} alt="Rajasthan" className="rounded-2xl w-full h-56 object-cover" />
                  <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                    Rajasthan
                  </div>
                 </div>
                 
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                 <Image src={keral} alt="Kerala" className="rounded-2xl w-full md:h-118 object-cover" />
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Kerala
                 </div>
                </div> 
              </div>    
            </div>    
            <div className="flex flex-col gap-4 md:w-1/2">
             <div className="w-full">
                <div className="relative">
                 <Image src={badrinath} alt="Uttarakhand" className="rounded-2xl w-full h-56 object-cover" />
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Uttarakhand
                 </div>
                 </div>
             </div>
             <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative md:w-1/2">
                 <Image src={himachal} alt="himachal" className="rounded-2xl  h-56 object-cover" />
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Himachal Pradesh
                 </div>
                 </div>
                 <div className="relative md:w-1/2">
                 <Image src={kashmir} alt="Kerala" className="rounded-2xl h-56 object-cover" />
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Kashmir
                 </div>
                 </div>
             </div>
             
             
            </div>
          </div>
        )}

        {active === "international" && (
          <div className="flex flex-col md:flex-row gap-4 mt-10 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative"> 
                 <Image src='https://res.cloudinary.com/dmmsemrty/image/upload/v1757589679/Foreign-28_jlecev.jpg' alt="Singapore" className="rounded-2xl w-full h-56 object-cover"  width={500} height={500}/>
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Singapore
                 </div>
                </div> 
                <div className="relative"> 
                 <Image src="https://res.cloudinary.com/dmmsemrty/image/upload/v1757333299/mft5sunkkkiy00clbs5b.jpg" alt="USA" className="rounded-2xl w-full h-56 object-cover" width={500} height={500}/>
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   USA
                 </div>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative">
                 <Image src="https://res.cloudinary.com/dmmsemrty/image/upload/v1757589679/Foreign-23_rcrewu.jpg" alt="VietNam" className="rounded-2xl w-full md:h-118 object-cover" width={500} height={500}/>
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   VietNam
                 </div>
                </div>
              </div>    
            </div>    
            <div className="flex flex-col gap-4 md:w-1/2">
             <div className="w-full">
                <div className="relative">
                 <Image src="https://res.cloudinary.com/dmmsemrty/image/upload/v1757589679/Foreign-24_pseran.jpg" alt="Thailand" className="rounded-2xl w-full h-56 object-cover" width={500} height={500}/>
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Thailand
                 </div>
                 </div>
             </div>
             <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative md:w-1/2">
                 <Image src={jaipur} alt="Rajasthan" className="rounded-2xl  h-56 object-cover" />
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Malaysia
                 </div>
                 </div>
                 <div className="relative md:w-1/2">
                 <Image src="https://res.cloudinary.com/dmmsemrty/image/upload/v1757589680/Foreign-25_1_lmw3lf.jpg" alt="Maldives" className="rounded-2xl h-56 object-cover" width={500} height={500}/>
                 <div className="absolute bottom-2 left-0 right-0 bg-black/50 text-white text-center py-1 font-semibold">
                   Maldives
                 </div>
                 </div>
             </div>
             
             
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
