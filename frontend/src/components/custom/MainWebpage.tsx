import Hero from "@/components/custom/Hero";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import ListBlogSidebar from "@/components/custom/ListBlogSidebar";
import Breadcrumb from "@/components/common/Breadcrumb";
import WhyChoose from "@/components/custom/WhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { notFound } from "next/navigation";
import { TestiProps } from "@/components/custom/Testimonial";

interface Faq {
  question: string;
  answer: string;
}
interface WebpageInterface {
  title: string;
  content: string;
  slug: string;
  coverImage?: {
    url?: string;
    public_id?: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  faqs?: Faq[];
  reviews?: TestiProps[];
  excerpt: string;
}
// const getRelatedPages = async (slug: string) => {
//   const res = await fetch(
//     `${process.env.NEXT_PUBLIC_BASE_URL}/visa/related/${slug}`
//   );
//   if (!res.ok) throw new Error("Failed to fetch related pages");
//   const data = await res.json();
//   return data;
// };
async function MainWebPage({ page }: { page: WebpageInterface }) {
  return (
    <section className="">
      <Hero
        image={page?.coverImage?.url || "/Hero2.jpg"}
        title={page?.title || " "}
        height="lg"
        description={page.excerpt}
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <article className="w-full md:w-2/3 space-y-10">
          {/* <header className="">
            <h1 className="text-3xl md:text-4xl font-bold"></h1>
          </header> */}
          <section className="prose prose-lg max-w-none">
            <BlogContent html={page.content} />
          </section>
          <section>
            <h2 className="text-2xl font-bold mt-8">{`FAQ's`}</h2>
            <p className="w-1/16 h-1 bg-[#FE5300] mb-4 mt-2"></p>
            <Accordion type="single" collapsible className="w-full">
              {page?.faqs?.map((faq: Faq, i: number) => (
                <AccordionItem
                  value={`faq-${i}`}
                  key={i}
                  className="rounded-2xl shadow-lg p-4"
                >
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-justify">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </article>
        <aside className="w-full md:w-1/3 md:sticky md:top-10 self-start ">
          <QueryForm />
          {/* {relatedPageArray.length > 0 && (
            <ListBlogSidebar
              blogs={relatedPageArray}
              title="Related Pages"
              type="latest"
              url="visa"
            />
          )} */}
        </aside>
      </div>
      <div className="max-w-7xl mx-auto  gap-8 px-4 sm:px-6 lg:px-8 py-10">
        <WhyChoose />
        <section>
          <Testimonial data={page.reviews ?? []} />
        </section>
      </div>
    </section>
  );
}

export default MainWebPage;
