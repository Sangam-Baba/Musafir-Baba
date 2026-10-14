import { Faqs } from "@/components/custom/Faqs";
import { getFAQSchema, type FaqsInterface } from "@/lib/schema/faq.schema";

// Visible FAQ section (the same <Faqs> section the home page uses) + FAQPage
// JSON-LD for pages whose FAQs are managed in the admin (Destinations /
// Category SEO pages). Renders nothing when there are no complete
// question/answer pairs, so pages without FAQs are unchanged.
export default function PageFaqs({
  faqs,
}: {
  faqs?: Partial<FaqsInterface>[] | null;
}) {
  const items = (faqs ?? [])
    .filter((f) => f?.question?.trim() && f?.answer?.trim())
    .map((f) => ({ question: f.question!.trim(), answer: f.answer!.trim() }));

  if (items.length === 0) return null;

  return (
    <>
      <Faqs faqs={items.map((f, i) => ({ id: i, ...f }))} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(getFAQSchema(items)).replace(/</g, "\\u003c"),
        }}
      />
    </>
  );
}
