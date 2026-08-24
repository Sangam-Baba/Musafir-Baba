"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    question: "How do I join MBConnect as a driver partner?",
    answer:
      "Tap \"Join MBConnect Today\" or message us on WhatsApp — our team will guide you through sign-up, document submission, and verification.",
  },
  {
    question: "What documents do I need to register?",
    answer:
      "A valid driving license, your vehicle's RC (in your name, or an NOC if it isn't), insurance and PUC certificate, and a smartphone with an internet connection.",
  },
  {
    question: "How often will I get paid?",
    answer:
      "Payments are made directly to your bank account on a regular, transparent schedule — you can track every payout inside the app once it's live.",
  },
  {
    question: "Can I drive part-time, or is it full-time only?",
    answer:
      "MBConnect is flexible — go online whenever suits you and drive at your own pace, whether that's a few hours a week or full-time.",
  },
  {
    question: "Who do I contact if I face an issue?",
    answer:
      "Our partner support team is available 24x7. You can reach us anytime via WhatsApp or the Contact Us page.",
  },
];

export default function FAQSection() {
  return (
    <section id="faqs" className="w-full px-4 md:px-8 py-16 md:py-24 bg-[#FAFAFA]/60 scroll-mt-16">
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
            Find quick answers to common queries about driving and earning with MBConnect.
          </p>
        </div>

        {/* Accordion Container */}
        <div className="w-full bg-white rounded-2xl border border-gray-200/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] px-5 sm:px-8 py-2 overflow-hidden">
          <Accordion type="single" collapsible defaultValue="faq-0" className="w-full divide-y divide-gray-100">
            {FAQS.map((faq, idx) => (
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

