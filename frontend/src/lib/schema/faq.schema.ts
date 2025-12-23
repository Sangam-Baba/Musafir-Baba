export interface FaqsInterface {
  question: string;
  answer: string;
}
export const getFAQSchema = (faqs: FaqsInterface[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq: FaqsInterface) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});
