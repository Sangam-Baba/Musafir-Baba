import React from "react";
import WhyChooseUs from "./WhyChooseUS";

function WhyChoose() {
  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        {/* Header Section */}
        <div className="w-full flex flex-col gap-1 items-start mb-10">
          <span className="text-[11px] md:text-[13px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase mb-2">
            WHY TRAVEL WITH US
          </span>
          <h2 className="text-3xl md:text-[40px] leading-tight font-medium text-gray-900">
            <span className="relative inline-block whitespace-nowrap">Why choose<span className="absolute -bottom-1 left-0 w-10 md:w-12 h-[3px] md:h-[4px] bg-[#FE5300] rounded-full"></span></span> MusafirBaba
          </h2>
          <p className="text-[15px] md:text-[17px] text-gray-600 mt-2 max-w-3xl">
            We combine expertise, transparency, and personalised planning to deliver unforgettable journeys.
          </p>
        </div>

        <WhyChooseUs />
      </div>
    </section>
  );
}

export default WhyChoose;
