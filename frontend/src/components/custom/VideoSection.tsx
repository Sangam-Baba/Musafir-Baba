import React from "react";
import { Card } from "../ui/card";
import Link from "next/link";

function VideoSection() {
  return (
    <section className="max-w-7xl mx-auto py-16 px-4 md:px-8 lg:px-20 py-16">
      {/* Header */}
      <div className="flex flex-col gap-3 items-center mb-12 md:mb-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center ">
          Behind the Scenes of Your Next Adventure
        </h2>
        <div className="w-16 h-1 bg-[#FE5300] rounded-full"></div>
        <p className="text-center text-slate-600 max-w-2xl">
          Get an inside look at how we craft memorable trips for every traveler
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
        <div className="lg:col-span-3 group cursor-pointer">
          <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-all duration-300 border-0 p-0">
            <div className="relative aspect-video">
              <iframe
                width="100%"
                height="100%"
                src="https://www.youtube.com/embed/DMD2uthghWE?si=2AunJKyD2-E8w6-Y"
                title="Behind the Scenes Video"
                className="w-full h-full object-cover z-10"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2 flex flex-col gap-6">
          <div>
            <h3 className="text-2xl  font-bold text-slate-900 mb-4">
              Watch Our Video
            </h3>
            <p className="text-slate-600 leading-relaxed text-sm md:text-base">
              Discover how we transform travel dreams into unforgettable
              experiences. From visa consultations to itinerary planning, our
              dedicated team works tirelessly to ensure every detail of your
              journey is perfect. Let our story inspire your next adventure.
            </p>
          </div>

          {/* CTA Button */}
          <div>
            <button className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
              <Link href="/about-us">Learn More About Us</Link>
            </button>
          </div>

          {/* Features List */}
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200">
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Expert visa consultation for 50+ destinations
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                Personalized travel itineraries tailored to your needs
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 rounded-full bg-orange-500 mt-2 flex-shrink-0"></div>
              <p className="text-sm text-slate-700">
                24/7 customer support throughout your journey
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default VideoSection;
