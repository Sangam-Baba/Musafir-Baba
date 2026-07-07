"use client";

import React, { useState } from "react";
import Image from "next/image";
import jaipur from "../../../public/jaipur.jpg";
import badrinath from "../../../public/badrinath.jpg";
import kashmir from "../../../public/kashmir.jpg";
import himachal from "../../../public/Himachal.jpg";
import Link from "next/link";
import { ArrowRight, Mountain, Globe } from "lucide-react";

export function DestinationSection() {
  const [active, setActive] = useState<"domestic" | "international">(
    "domestic",
  );

  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="flex flex-col items-start max-w-7xl mx-auto w-full">
        
        {/* Header Section */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div className="flex flex-col gap-1 items-start">
            <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
              TRENDING DESTINATIONS
            </span>
            <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
              <span>Top destinations</span> in India and around the world
            </h2>
            <p className="text-[14px] md:text-[16px] text-gray-600">
              Discover trending destinations across India and abroad.
            </p>
          </div>
          
          <Link 
            href="/destinations" 
            className="flex items-center gap-1 text-[#FE5300] font-medium hover:text-[#e04800] transition-colors shrink-0 mb-1 pb-1"
          >
            View all <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {/* Toggle Pill */}
        <div className="w-full flex items-center mb-8">
          <div className="relative bg-[#F8F9FA] p-1 rounded-2xl flex w-full max-w-[340px] border border-gray-200/60">
            
            {/* Slide dynamic bubble helper background */}
            <div 
              className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-gradient-to-r from-[#FE5300] to-orange-500 rounded-xl transition-all duration-300 ease-out shadow-md shadow-[#FE5300]/20 ${
                active === "domestic" ? "left-1" : "left-1/2"
              }`}
            ></div>
            
            <button
              onClick={() => setActive("domestic")}
              className={`z-10 flex-1 flex items-center justify-center py-2.5 text-center text-[13px] font-bold transition-colors duration-300 ${
                active === 'domestic' ? 'text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mountain className="w-[15px] h-[15px] mr-1.5" strokeWidth={2.5} /> Domestic trips
            </button>
            <button
              onClick={() => setActive("international")}
              className={`z-10 flex-1 flex items-center justify-center py-2.5 text-center text-[13px] font-bold transition-colors duration-300 ${
                active === 'international' ? 'text-white' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Globe className="w-[15px] h-[15px] mr-1.5" strokeWidth={2.5} /> International trips
            </button>
          </div>
        </div>

        {/* Content Section */}
        {active === "domestic" && (
          <div className="hidden md:flex md:flex-row gap-4 w-full">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative group overflow-hidden rounded-2xl">
                  <Link href="/destinations/uttarakhand">
                    <Image
                      src={badrinath}
                      alt="Uttarakhand"
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="rounded-2xl w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Uttarakhand
                  </h4>
                </div>
                <div className="relative group overflow-hidden rounded-2xl">
                  <Link href="/destinations/rajasthan">
                    <Image
                      src={jaipur}
                      alt="Rajasthan"
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="rounded-2xl w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Rajasthan
                  </h4>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative group overflow-hidden rounded-2xl h-full">
                  <Link href="/destinations/kerala">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Untitled_design_5_hgguwf.jpg"
                      alt="Kerala"
                      className="rounded-2xl w-full md:h-118 h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Kerala
                  </h4>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:w-1/2">
              <div className="w-full">
                <div className="relative group overflow-hidden rounded-2xl">
                  <Link href="/destinations/meghalaya">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Untitled_design_6_mggpgh.jpg"
                      alt="meghalaya"
                      className="rounded-2xl w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Meghalaya
                  </h4>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative group overflow-hidden rounded-2xl md:w-1/2">
                  <Link href="/destinations/himachal-pradesh">
                    <Image
                      src={himachal}
                      alt="himachal"
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="rounded-2xl h-56 object-cover group-hover:scale-105 transition-transform duration-700 w-full"
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Himachal Pradesh
                  </h4>
                </div>
                <div className="relative group overflow-hidden rounded-2xl md:w-1/2">
                  <Link href="/destinations/jammu-and-kashmir">
                    <Image
                      src={kashmir}
                      alt="Kashmir"
                      loading="lazy"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      className="rounded-2xl h-56 object-cover group-hover:scale-105 transition-transform duration-700 w-full"
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Kashmir
                  </h4>
                </div>
              </div>
            </div>
          </div>
        )}

        {active === "international" && (
          <div className="hidden md:flex md:flex-row gap-4 w-full ">
            <div className="flex flex-col md:flex-row gap-4 md:w-1/2">
              <div className="flex flex-col gap-4 md:w-1/2">
                <div className="relative group overflow-hidden rounded-2xl">
                  <Link href="/destinations/singapore">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Singapore_bdsaps.jpg"
                      alt="Singapore"
                      className="rounded-2xl w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Singapore
                  </h4>
                </div>
                <div className="relative group overflow-hidden rounded-2xl">
                  <Link href="/destinations/dubai">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Untitled_design_4_yrnksb.jpg"
                      alt="Dubai"
                      className="rounded-2xl w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Dubai
                  </h4>
                </div>
              </div>
              <div className="md:w-1/2">
                <div className="relative group overflow-hidden rounded-2xl h-full">
                  <Link href="/destinations/bali">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Bali_sc5oct.jpg"
                      alt="Bali"
                      className="rounded-2xl w-full md:h-118 h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Bali
                  </h4>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-4 md:w-1/2">
              <div className="w-full">
                <div className="relative group overflow-hidden rounded-2xl">
                  <Link href="/destinations/thailand">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Thailand_btmxk6.jpg"
                      alt="Thailand"
                      className="rounded-2xl w-full h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Thailand
                  </h4>
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 w-full">
                <div className="relative group overflow-hidden rounded-2xl md:w-1/2">
                  <Link href="/destinations/japan">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Untitled_design_3_g8ok0g.jpg"
                      alt="Japan"
                      className="rounded-2xl h-56 object-cover group-hover:scale-105 transition-transform duration-700 w-full"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Japan
                  </h4>
                </div>
                <div className="relative group overflow-hidden rounded-2xl md:w-1/2 ">
                  <Link href="/destinations/maldives">
                    <Image
                      src="https://cdn.musafirbaba.com/images/Untitled_design_2_rrfsvj.jpg"
                      alt="Maldives"
                      className="rounded-2xl h-56 object-cover group-hover:scale-105 transition-transform duration-700 w-full"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      width={500}
                      height={500}
                    />
                  </Link>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                  <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[20px] font-semibold tracking-wide">
                    Maldives
                  </h4>
                </div>
              </div>
            </div>
          </div>
        )}
        {active === "domestic" && (
          <div className="flex md:hidden gap-4 mt-4 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4">
            {[
              {
                title: "Uttarakhand",
                href: "/destinations/uttarakhand",
                img: "https://cdn.musafirbaba.com/images/badrinath.jpg",
              },
              {
                title: "Rajasthan",
                href: "/destinations/rajasthan",
                img: "https://cdn.musafirbaba.com/images/jaipur.jpg",
              },
              {
                title: "Kerala",
                href: "/destinations/kerala",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_5_hgguwf.jpg",
              },
              {
                title: "Meghalaya",
                href: "/destinations/meghalaya",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_6_mggpgh.jpg",
              },
              {
                title: "Himachal Pradesh",
                href: "/destinations/himachal-pradesh",
                img: "https://cdn.musafirbaba.com/Himachal.jpg",
              },
              {
                title: "Kashmir",
                href: "/destinations/jammu-and-kashmir",
                img: "https://cdn.musafirbaba.com/kashmir.jpg",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative min-w-[260px] snap-start group overflow-hidden rounded-2xl"
              >
                <Link href={item.href} className="z-10">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={260}
                    height={224}
                    sizes="(max-width: 768px) 260px, 33vw"
                    className="rounded-2xl h-56 object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </Link>

                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[18px] font-semibold tracking-wide">
                  {item.title}
                </h4>
              </div>
            ))}
          </div>
        )}

        {active === "international" && (
          <div className="flex md:hidden gap-4 mt-4 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory pb-4">
            {[
              {
                title: "Singapore",
                href: "/destinations/singapore",
                img: "https://cdn.musafirbaba.com/images/Singapore_bdsaps.jpg",
              },
              {
                title: "Dubai",
                href: "/destinations/dubai",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_4_yrnksb.jpg",
              },
              {
                title: "Bali",
                href: "/destinations/bali",
                img: "https://cdn.musafirbaba.com/images/Bali_sc5oct.jpg",
              },
              {
                title: "Thailand",
                href: "/destinations/thailand",
                img: "https://cdn.musafirbaba.com/images/Thailand_btmxk6.jpg",
              },
              {
                title: "Japan",
                href: "/destinations/japan",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_3_g8ok0g.jpg",
              },
              {
                title: "Maldives",
                href: "/destinations/maldives",
                img: "https://cdn.musafirbaba.com/images/Untitled_design_2_rrfsvj.jpg",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="relative min-w-[260px] md:min-w-0 md:flex-1 snap-start group overflow-hidden rounded-2xl"
              >
                <Link href={item.href} className="z-10">
                  <Image
                    src={item.img}
                    alt={item.title}
                    width={500}
                    height={500}
                    sizes="(max-width: 768px) 260px, 33vw"
                    className="rounded-2xl h-56 w-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </Link>
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent rounded-2xl" />
                <h4 className="pointer-events-none absolute bottom-4 left-5 text-white text-[18px] font-semibold tracking-wide">
                  {item.title}
                </h4>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
