import React from "react";
import WhyChooseUs from "./WhyChooseUS";

function WhyChoose() {
  return (
    <section className="w-full max-w-7xl mx-auto px-4 md:px-8 lg:px-20  py-8 flex flex-col items-center">
      <div className="flex flex-col gap-2 items-center py-4 text-center">
        <h2 className="text-lg md:text-3xl font-bold">
          {`Why Choose MusafirBaba`}
        </h2>
        <div className="h-1 w-24 bg-[#FE5300] rounded-full"></div>
        <p className="text-gray-600">
          We combine expertise, transparency, and personalised planning to
          deliver unforgettable journeys
        </p>
      </div>

      <WhyChooseUs />
    </section>
  );
}

export default WhyChoose;
