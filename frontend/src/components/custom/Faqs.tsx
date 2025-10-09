"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    <section className="w-full px-4 md:px-8 lg:px-20 py-16">
      <div className="flex flex-col gap-10 items-center max-w-7xl mx-auto">
        {/* Section Title */}
        <div className="text-center">
          <h3 className="text-2xl md:text-3xl font-bold">
            Frequently Asked Questions (FAQs)
          </h3>
          <div className="h-1 w-24 bg-[#FE5300] rounded-full mx-auto mt-2"></div>
        </div>

        {/* FAQ Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Left Column */}
          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue={firstColumn[0]?.id.toString()}
          >
            {firstColumn.map((faq) => (
              <AccordionItem
                value={faq.id.toString()}
                key={faq.id}
                className="rounded-2xl shadow-lg p-4"
              >
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-justify">
                  <p>{faq.answer}</p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {/* Right Column */}
          <Accordion
            type="single"
            collapsible
            className="w-full"
            defaultValue={secondColumn[0]?.id.toString()}
          >
            {secondColumn.map((faq) => (
              <AccordionItem
                value={faq.id.toString()}
                key={faq.id}
                className="rounded-2xl shadow-lg p-4"
              >
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent className="flex flex-col gap-4 text-justify">
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
