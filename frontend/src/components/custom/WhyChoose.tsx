import React from "react";
import WhyChooseUs from "./WhyChooseUS";

function WhyChoose() {
  return (
    <section className="w-full bg-white px-4 md:px-10 py-12 md:py-20 border-t border-gray-100">
      <div className="w-full max-w-7xl mx-auto flex flex-col items-start">
        
        {/* Header Section */}
        <div className="w-full flex flex-col gap-1 items-start mb-6">
          <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
            WHY TRAVEL WITH US
          </span>
          <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
            <span>Why choose</span> MusafirBaba
          </h2>
          <p className="text-[14px] md:text-[16px] text-gray-600 max-w-3xl text-left">
            We combine expertise, transparency, and personalised planning to deliver unforgettable journeys.
          </p>
        </div>

        <WhyChooseUs />
      </div>
    </section>
  );
}

export default WhyChoose;
