"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const MBGO_FAQS = [
  {
    question: "What is MBGo by MusafirBaba?",
    answer:
      "MBGo is a smart mobility and ride-booking app by MusafirBaba that provides local city rides, outstation one-way and round trips, airport transfers, and car rentals across India with verified drivers and transparent pricing.",
  },
  {
    question: "How do I book a ride on MBGo?",
    answer:
      "You can enter your pickup location, destination, and preferred date/time on the booking widget above, or download the MBGo app on Android (Google Play) and iOS (App Store) for instant one-tap booking and live ride tracking.",
  },
  {
    question: "Are prices fixed or are there hidden charges?",
    answer:
      "MBGo offers 100% transparent pricing with zero hidden fees. Tolls, driver allowances, and taxes are clearly indicated before you confirm your ride.",
  },
  {
    question: "What safety features does MBGo have?",
    answer:
      "All MBGo drivers undergo thorough background verification and training. Trips include live GPS tracking, 24x7 customer support, and emergency SOS assistance directly within the app.",
  },
  {
    question: "Can I book outstation cabs for one-way journeys?",
    answer:
      "Yes! MBGo offers one-way outstation cab booking so you only pay for the distance you travel, saving you up to 50% compared to traditional round-trip charges.",
  },
  {
    question: "How do I join as a driver or vehicle partner?",
    answer:
      "If you are a driver or vehicle owner, you can join MBConnect (our dedicated partner platform) by visiting /mbconnect to start earning with weekly payouts and flexible hours.",
  },
];

export default function MBGoFAQSection() {
  return (
    <section id="safety" className="w-full px-4 md:px-8 py-16 md:py-24 bg-[#FAFAFA]/70 scroll-mt-16">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        {/* Section Title */}
        <div className="w-full flex flex-col gap-1 items-center text-center mb-10 md:mb-12">
          <span className="text-[11px] md:text-[12px] font-bold tracking-[0.1em] text-[#FE5300] uppercase">
            COMMON QUESTIONS
          </span>
          <h2 className="text-2xl md:text-[32px] leading-tight font-bold text-gray-900 tracking-tight">
            Frequently Asked <span className="text-[#FE5300]">Questions</span>
          </h2>
          <p className="text-[14px] md:text-[15px] text-gray-500 mt-1">
            Everything you need to know about booking rides, safety, and rentals with MBGo.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="w-full bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-5 sm:px-8 py-2 overflow-hidden">
          <Accordion type="single" collapsible defaultValue="faq-0" className="w-full divide-y divide-gray-100">
            {MBGO_FAQS.map((faq, idx) => (
              <AccordionItem
                key={faq.question}
                value={`faq-${idx}`}
                className="border-b-0 py-1"
              >
                <AccordionTrigger className="text-[14.5px] md:text-[15.5px] font-semibold text-gray-900 hover:text-[#FE5300] hover:no-underline py-4.5 transition-colors outline-none focus:outline-none focus-visible:ring-0">
                  <span className="text-left leading-snug">{faq.question}</span>
                </AccordionTrigger>
                <AccordionContent className="text-[13.5px] md:text-[14px] text-gray-600 leading-relaxed pb-5 pt-0">
                  <p>{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
