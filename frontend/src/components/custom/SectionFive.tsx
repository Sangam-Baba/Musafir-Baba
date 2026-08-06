import React from "react";
import Image from "next/image";
import LazyQueryFormInView from "./LazyQueryFormInView";
import { Star, Clock, ShieldCheck, MessageCircle } from "lucide-react";

function SectionFive() {
  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        {/* Header */}
        <div className="flex flex-col gap-1 items-center md:items-start text-center md:text-left mb-6">
          <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
            PLAN YOUR TRIP
          </span>
          <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
            <span>Get a</span> free quote
          </h2>
          <p className="text-[14px] md:text-[16px] text-gray-600 max-w-3xl">
            Share trip details — get a custom plan within 24 hours.
          </p>
        </div>

        {/* Main Box */}
        <div className="w-full border border-gray-200 rounded-2xl bg-white p-6 md:p-10 shadow-sm flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          
          {/* Left Text Container (Split into Graphic & Text) */}
          <div className="flex flex-col w-full lg:w-[55%] pb-8 lg:pb-0 lg:pr-12">
            
            {/* Top Row: Decorative Mountain Graphic */}
            <div className="w-full flex-1 min-h-[200px] bg-gradient-to-b from-blue-50 to-white rounded-2xl relative overflow-hidden mb-8 border border-gray-100">
              <Image 
                src="/enqueryImage1.avif" 
                alt="Plan your trip" 
                fill 
                className="object-cover" 
              />
            </div>

            {/* Bottom Row: Text Content */}
            <div className="flex flex-col">
              <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
                Our team will get back to you with a personalised itinerary, pricing, and availability — no commitment required.
              </p>

              <div className="flex flex-col gap-5">
                <div className="flex items-center gap-4">
                  <Star className="w-5 h-5 text-[#FE5300]" strokeWidth={1.75} />
                  <span className="text-[15px] text-gray-600 font-medium">4.8 Google rating · 24,247 travellers served</span>
                </div>
                <div className="flex items-center gap-4">
                  <Clock className="w-5 h-5 text-[#FE5300]" strokeWidth={1.75} />
                  <span className="text-[15px] text-gray-600 font-medium">Response within 2 hours on WhatsApp</span>
                </div>
                <div className="flex items-center gap-4">
                  <ShieldCheck className="w-5 h-5 text-[#FE5300]" strokeWidth={1.75} />
                  <span className="text-[15px] text-gray-600 font-medium">No hidden charges · Transparent pricing</span>
                </div>
                <div className="flex items-center gap-4">
                  <MessageCircle className="w-5 h-5 text-[#FE5300]" strokeWidth={1.75} />
                  <span className="text-[15px] text-gray-600 font-medium">Also reach us on +91 92896 02447</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Form Container */}
          <div className="w-full lg:w-[45%] flex flex-col justify-center pt-8 lg:pt-0 lg:pl-12">
            <div className="w-full xl:max-w-xl mx-auto flex flex-col">
              <h3 className="text-[22px] md:text-[28px] font-medium text-gray-900 mb-6">
                Talk to a travel expert
              </h3>
              <LazyQueryFormInView variant="minimal" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default SectionFive;
