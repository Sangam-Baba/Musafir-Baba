"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BlogContent } from "./BlogContent";

type Faq = {
  id: string | number;
  question: string;
  answer: string;
};

interface FaqsProps {
  faqs: Faq[];
}

export function Faqs({ faqs }: FaqsProps) {
  // Split FAQs into 2 columns for medium+ screens
  const midIndex = Math.ceil(faqs.length / 2);
  const firstColumn = faqs.slice(0, midIndex);
  const secondColumn = faqs.slice(midIndex);

  return (
    <section className="w-full px-4 md:px-8 lg:px-10 py-12 md:py-16">
      <div className="flex flex-col items-start max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="w-full flex flex-col gap-1 items-center text-center mb-10 md:mb-14">
          <span className="text-[10px] md:text-[12px] font-semibold tracking-[0.08em] text-[#FE5300] uppercase">
            COMMON QUESTIONS
          </span>
          <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
            <span>Frequently asked</span> questions
          </h2>
          <p className="text-[14px] md:text-[16px] text-gray-600">
            Find quick answers to your travel and visa queries.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="w-full rounded-xl overflow-hidden bg-white flex flex-col md:flex-row shadow-sm divide-y md:divide-y-0 md:divide-x divide-gray-200">
          {/* Left Column */}
          <div className="w-full md:w-1/2 flex flex-col">
            <Accordion type="single" collapsible className="w-full">
              {firstColumn.map((faq, idx) => (
                <AccordionItem
                  value={faq.id?.toString()}
                  key={faq.id}
                  className="px-4 md:px-6"
                >
                  <AccordionTrigger className="text-[15px] font-medium text-gray-900 hover:text-[#FE5300] hover:no-underline py-4 transition-colors outline-none focus:outline-none focus-visible:ring-0">
                    <p className="text-left">{faq.question}</p>
                  </AccordionTrigger>
                  <AccordionContent className="text-[14px] text-gray-600 leading-relaxed pb-4">
                    <section className="prose prose-sm max-w-none prose-p:my-0">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right Column */}
          <div className="w-full md:w-1/2 flex flex-col">
            <Accordion type="single" collapsible className="w-full">
              {secondColumn.map((faq, idx) => (
                <AccordionItem
                  value={faq.id?.toString()}
                  key={faq.id}
                  className="px-4 md:px-6"
                >
                  <AccordionTrigger className="text-[15px] font-medium text-gray-900 hover:text-[#FE5300] hover:no-underline py-4 transition-colors outline-none focus:outline-none focus-visible:ring-0">
                    <p className="text-left">{faq.question}</p>
                  </AccordionTrigger>
                  <AccordionContent className="text-[14px] text-gray-600 leading-relaxed pb-4">
                    <section className="prose prose-sm max-w-none prose-p:my-0">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}
