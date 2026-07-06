import React from "react";
import LazyQueryFormInView from "./LazyQueryFormInView";
import { Star, Clock, ShieldCheck, MessageCircle } from "lucide-react";

function SectionFive() {
  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        {/* Header */}
        <div className="w-full flex flex-col gap-1 items-start mb-8">
          <span className="text-[11px] md:text-[13px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase mb-2">
            PLAN YOUR TRIP
          </span>
          <h2 className="text-3xl md:text-[40px] leading-tight font-medium text-gray-900 mt-2">
            <span className="relative inline-block whitespace-nowrap">Get a<span className="absolute -bottom-1 left-0 w-10 md:w-12 h-[3px] md:h-[4px] bg-[#FE5300] rounded-full"></span></span> free quote
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 mt-2 max-w-3xl">
            Share trip details — get a custom plan within 24 hours.
          </p>
        </div>

        {/* Main Box */}
        <div className="w-full border border-gray-200 rounded-2xl bg-white p-6 md:p-10 shadow-sm flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
          
          {/* Left Text Container (Split into Graphic & Text) */}
          <div className="flex flex-col w-full lg:w-[55%] pb-8 lg:pb-0 lg:pr-12">
            
            {/* Top Row: Decorative Mountain Graphic */}
            <div className="w-full h-32 md:h-40 bg-gradient-to-b from-blue-50 to-white rounded-2xl relative overflow-hidden mb-6 border border-gray-100 flex-shrink-0">
              <style dangerouslySetInnerHTML={{__html: `
                @keyframes mountainBreathe {
                  0%, 100% { transform: scaleY(1); }
                  50% { transform: scaleY(1.05); }
                }
                .animate-mountain-breathe-2 {
                  animation: mountainBreathe 12s ease-in-out infinite;
                  transform-origin: bottom;
                  animation-delay: -4s;
                }
                .animate-mountain-breathe-3 {
                  animation: mountainBreathe 15s ease-in-out infinite;
                  transform-origin: bottom;
                  animation-delay: -8s;
                }
              `}} />
              {/* Sky Glow / Sun */}
              <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-32 h-32 rounded-full bg-gradient-to-t from-blue-400 to-transparent opacity-20 blur-3xl animate-pulse-glow"></div>
              
              {/* Star Spangles */}
              <div className="absolute top-4 left-1/4 w-1.5 h-1.5 rounded-full bg-blue-500 opacity-40 animate-pulse-glow"></div>
              <div className="absolute top-8 right-1/3 w-1 h-1 rounded-full bg-blue-500 opacity-30 animate-pulse-glow" style={{ animationDelay: '1.5s' }}></div>

              {/* Floating Drifting Clouds */}
              <div className="absolute top-4 left-0 w-[80px] h-4 opacity-20 pointer-events-none animate-drift-cloud" style={{ animationDelay: '-15s', animationDuration: '45s' }}>
                  <svg viewBox="0 0 100 30" fill="#3B82F6" className="w-full h-full">
                      <path d="M10 20 A 10 10 0 0 1 30 20 A 15 15 0 0 1 65 20 A 12 12 0 0 1 90 20 Z" />
                  </svg>
              </div>

              {/* Gliding Birds */}
              <div className="absolute top-8 left-1/3 w-10 h-5 opacity-30 pointer-events-none animate-sway-birds">
                  <svg viewBox="0 0 50 20" className="w-full h-full fill-none stroke-[#3B82F6]" strokeWidth="1.5">
                      <path d="M 5,12 C 10,8 15,12 20,15 C 25,12 30,8 35,12" />
                      <path d="M 18,6 C 22,2 25,6 28,8 C 31,6 34,2 38,6" />
                  </svg>
              </div>

              {/* Mountain Layers */}
              <div className="absolute -bottom-[1px] left-0 w-full h-[90px] md:h-[110px]">
                  <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="w-full h-full fill-[#3B82F6] opacity-25 animate-mountain-breathe-3">
                      <path d="M0,200 L120,80 L240,140 L380,40 L500,130 L640,60 L800,200" />
                  </svg>
              </div>
              <div className="absolute -bottom-[1px] left-0 w-full h-[60px] md:h-[80px]">
                  <svg viewBox="0 0 800 200" preserveAspectRatio="none" className="w-full h-full fill-[#3B82F6] opacity-15 animate-mountain-breathe-2">
                      <path d="M0,200 L180,70 L340,150 L520,50 L680,120 L800,200" />
                  </svg>
              </div>
            </div>

            {/* Bottom Row: Text Content */}
            <div className="flex flex-col">
              <h3 className="text-[22px] md:text-[28px] font-medium text-gray-900 mb-4">
                Talk to a travel expert
              </h3>
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
            <div className="w-full xl:max-w-xl mx-auto">
              <LazyQueryFormInView variant="minimal" />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

export default SectionFive;
