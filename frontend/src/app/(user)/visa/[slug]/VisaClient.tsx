"use client";

import React, { useState } from "react";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

type TabKey = "description" | "faqs" | "documents" | "process";

interface Faq {
  question: string;
  answer: string;
}

export default function VisaClient({ visa }: { visa: any }) {
  const [active, setActive] = useState<TabKey>("description");
  const [openItem, setOpenItem] = useState<string | undefined>(undefined);

  const tabs: { key: TabKey; label: string }[] = [
    { key: "description", label: "Description" },
  ];

  if (visa.process && visa.process.length > 0) {
    tabs.push({ key: "process", label: "Process" });
  }
  if (visa.necessaryDocuments && visa.necessaryDocuments.length > 0) {
    tabs.push({ key: "documents", label: "Documents" });
  }
  if (visa.faqs && visa.faqs.length > 0) {
    tabs.push({ key: "faqs", label: "FAQs" });
  }

  return (
    <div className="w-full">
      <div className="flex md:flex-wrap w-full gap-2 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            size="lg"
            onClick={() => setActive(tab.key)}
            className={`mt-4 ${
              active === tab.key
                ? "bg-[#FE5300] hover:bg-[#FE5300]"
                : "bg-white hover:bg-gray-50 text-black border border-[#FE5300]"
            }`}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="mt-8 w-full">
        {active === "description" && (
          <div className="rounded-xl bg-[#87E87F]/20 px-8 py-6 shadow">
            <section className="prose prose-lg max-w-none">
              <BlogContent html={visa.content} />
            </section>
          </div>
        )}

        {active === "faqs" && visa.faqs && visa.faqs.length > 0 && (
          <Accordion
            type="single"
            collapsible
            value={openItem}
            onValueChange={setOpenItem}
            className="w-full space-y-3 rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow"
          >
            {visa.faqs.map((faq: Faq, index: number) => {
              const isOpen = openItem === `faq-${index}`;
              return (
                <AccordionItem
                  key={index}
                  value={`faq-${index}`}
                  className="rounded-2xl shadow-sm p-4 bg-white"
                >
                  <AccordionTrigger className="text-base md:text-lg font-semibold hover:text-[#FE5300] transition-colors hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-justify">
                    <section className="prose prose-lg max-w-none text-gray-600">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}

        {active === "documents" && visa.necessaryDocuments && visa.necessaryDocuments.length > 0 && (
          <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">Required Documents</h3>
            <ul className="space-y-3">
              {visa.necessaryDocuments.map((doc: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{doc}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {active === "process" && visa.process && visa.process.length > 0 && (
          <div className="rounded-xl bg-[#87E87F]/20 px-4 py-6 shadow">
            <h3 className="text-lg font-semibold text-foreground mb-4">Step-by-Step Process</h3>
            <ul className="space-y-3">
              {visa.process.map((step: string, idx: number) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                  <span className="text-sm text-foreground">{step}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
