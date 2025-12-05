"use client";
import React from "react";
import { Card } from "../ui/card";
import Link from "next/link";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import LiteYouTubeEmbed from "react-lite-youtube-embed";
import { Check } from "lucide-react";

function VideoSection() {
  return (
    <section
      className="w-full px-4 md:px-8 lg:px-20 py-6 md:py-16 my-12 relative bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `url(https://res.cloudinary.com/dmmsemrty/image/upload/v1763462027/Rajpath-delhi-shutterstock_1195751923.jpg_7647e1aad2_1_efilvh.webp)`,
      }}
    >
      <div className="absolute inset-0 bg-[#251203]/90 "></div>
      <section className="max-w-7xl mx-auto py-16 px-4 items-center justify-center  py-16 relative z-50">
        <div className="flex flex-col gap-2 items-center mb-8 text-center">
          <h3 className="text-2xl md:text-3xl  font-bold text-white ">
            {`About MusafirBaba - India's Trusted Travel Partner`}
          </h3>
          <div className="w-16 h-1 bg-[#FE5300] rounded-full mb-4"></div>
          <p>Trusted for holidays, visas, and end-to-end travel support</p>
        </div>
        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-13 items-center">
          <div className="lg:col-span-4 group cursor-pointer">
            <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 p-0">
              <div className="relative aspect-video">
                <LiteYouTubeEmbed
                  id="iFEIzFtT8yQ"
                  title="Behind the Scenes Video"
                  lazyLoad={true}
                  poster="maxresdefault" // better thumbnail quality
                  cookie={true} // privacy mode, faster load
                  webp={true} // lighter images
                  playlist={false}
                ></LiteYouTubeEmbed>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-3 flex flex-col gap-2">
            <div>
              <p className="text-white leading-relaxed text-sm md:text-base">
                At MusafirBaba, we curate meaningful travel experiences — not
                just packages. Our team blends local expertise with global
                exposure to create tailored holidays, smooth visa assistance,
                and stress-free planning. Whether it’s a family vacation, your
                dream honeymoon, or your first international trip, we ensure
                comfort, clarity, and unforgettable memories.{" "}
                <Link href="/about-us" className="text-[#FE5300]">
                  Read More...
                </Link>
              </p>
            </div>

            {/* CTA Button */}
            {/* <div>
              <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                <Link href="/about-us">Learn More About Us</Link>
              </button>
            </div> */}

            {/* Features List */}
            <div className="flex flex-col gap-3 pt-2 border-t border-slate-200">
              <div className="flex gap-2 items-start">
                <Check
                  strokeWidth={3}
                  className="text-orange-500 flex-shrink-0 font-bold"
                />

                <p className="text-sm ">
                  Tailor-made itineraries for every travel style
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <Check
                  strokeWidth={3}
                  className="text-orange-500 flex-shrink-0"
                />
                <p className="text-sm">
                  Expert visa assistance with fast processing
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <Check
                  strokeWidth={3}
                  className="text-orange-500 flex-shrink-0"
                />
                <p className="text-sm">
                  Reliable support before and during your trip
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <Check
                  strokeWidth={3}
                  className="text-orange-500 flex-shrink-0"
                />
                <p className="text-sm ">
                  Trusted by thousands of travellers across India
                </p>
              </div>
              <div className="flex gap-2 items-start">
                <Check
                  strokeWidth={3}
                  className="text-orange-500 flex-shrink-0"
                />
                <p className="text-sm ">
                  Simple, transparent, and customer-first approach
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  );
}

export default VideoSection;
