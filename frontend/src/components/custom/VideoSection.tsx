"use client";
import React from "react";
import { Card } from "../ui/card";
import Link from "next/link";
import "react-lite-youtube-embed/dist/LiteYouTubeEmbed.css";
import LiteYouTubeEmbed from "react-lite-youtube-embed";

function VideoSection() {
  return (
    <section
      className="w-full px-4 md:px-8 lg:px-20 py-6 md:py-16 my-12 relative bg-cover bg-center bg-no-repeat text-white"
      style={{
        backgroundImage: `url(https://res.cloudinary.com/dmmsemrty/image/upload/v1763462027/Rajpath-delhi-shutterstock_1195751923.jpg_7647e1aad2_1_efilvh.webp)`,
      }}
    >
      <div className="absolute inset-0 bg-[#251203]/90 "></div>
      <section className="max-w-7xl mx-auto py-16 px-4  py-16 relative z-50">
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
              <h3 className="text-2xl md:text-3xl  font-bold text-white ">
                About MusafirBaba
              </h3>
              <div className="w-16 h-1 bg-[#FE5300] rounded-full mb-4"></div>
              <p className="text-white leading-relaxed text-sm md:text-base">
                MusafirBaba is a modern travel planning company built on one
                simple promise - to make travel easy, transparent, and truly
                personalised. From weekend getaways and international holidays
                to group tours and custom itineraries, we design every trip with
                care, precision, and real local expertise. Over the years, we’ve
                helped thousands of travellers explore new places with
                confidence through our expert visa assistance, curated tour
                packages, and reliable support at every step. Whether you’re
                travelling solo, with family, or visiting India from abroad, our
                team ensures a smooth experience-right from planning and
                documentation to bookings and on-trip guidance.{" "}
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
            {/* <div className="flex flex-col gap-3 pt-2 border-t border-slate-200">
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Tailor-made itineraries for every travel style
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Expert visa assistance with fast processing
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Reliable support before and during your trip
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Trusted by thousands of travellers across India
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Simple, transparent, and customer-first approach
              </p>
            </div>
          </div> */}
          </div>
        </div>
      </section>
    </section>
  );
}

export default VideoSection;
