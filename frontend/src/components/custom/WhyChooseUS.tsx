import Image from "next/image";
import React from "react";

function WhyChooseUs() {
  const data = [
    {
      id: 1,
      title: "Personalised Trips Crafted by Experts",
      description:
        "Every itinerary is designed by professional travel planners who understand your interests, budget, and travel style.",
      url: "https://cdn.musafirbaba.com/images/planning_1980949-new_yjy4vw.png",
    },
    {
      id: 2,
      title: "Transparent Pricing - No Hidden Charges",
      description:
        "You always know what you’re paying for. All our packages come with clear inclusions and honest pricing.",
      url: "https://cdn.musafirbaba.com/images/price_13080043_d7lyms.png",
    },
    {
      id: 3,
      title: "Complete Visa & Documentation Support",
      description:
        "Our dedicated visa experts assist with paperwork, submissions, and guidance to ensure a smooth approval process",
      url: "https://cdn.musafirbaba.com/images/citizenship_7550833_yxp6f5.png",
    },
    {
      id: 4,
      title: "24×7 On-Trip Assistance",
      description:
        "From minor questions to last-minute changes, our support team stays connected with you throughout the journey.",
      url: "https://cdn.musafirbaba.com/images/24-7-service_17062434-new_cw1xje.png",
    },
    {
      id: 5,
      title: "Trusted by Thousands of Travellers",
      description:
        "With strong Google ratings and repeat customers, we’re proud of the trust we’ve built over the years.",
      url: "https://cdn.musafirbaba.com/images/customer_18482548_tax102.png",
    },
    {
      id: 6,
      title: "Handpicked Hotels, Guides & Experiences",
      description:
        "We partner only with verified hotels, transport providers, and local experts to ensure safety and quality.",
      url: "https://cdn.musafirbaba.com/images/experts_15108104-new_q5uy6p.png",
    },
  ];
  return (
    <section className="w-full ">
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mt-8 w-full justify-center items-center">
        {data.map((data) => (
          <div
            key={data.id}
            className="flex-1 flex flex-col gap-2 items-center"
          >
            <Image
              src={data.url}
              width={500}
              height={500}
              alt={data.title}
              sizes="(max-width: 768px) 150px, 200px"
              className="rounded-2xl w-25 h-25 hover:scale-105  hover:shadow-xl transition duration-500"
            />
            <div className="h-25 space-y-1">
              <p className="text-lg font-semibold text-center">{data.title}</p>
              <p className="text-sm text-center">{data.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CSS Scroll Carousel for Mobile */}
      <div className="md:hidden flex gap-4 mt-8 w-full overflow-x-auto no-scrollbar snap-x snap-mandatory px-4 pb-4">
        {data.map((data, i) => (
          <div
            key={`choose-${i}-${data.id}`}
            className="flex flex-col gap-2 items-center min-w-[200px] snap-start"
          >
            <Image
              src={data.url}
              width={150}
              height={150}
              alt={data.title}
              sizes="(max-width: 768px) 150px, 150px"
              className="rounded-2xl w-[100px] h-[100px] md:w-15 md:h-15"
            />
            <div className="space-y-1 mt-2">
              <p className="text-md font-semibold text-center leading-tight">
                {data.title}
              </p>
              <p className="text-sm text-center text-gray-600 line-clamp-3">
                {data.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default WhyChooseUs;
