import Hero from "@/components/custom/Hero";
import QueryForm from "@/components/custom/QueryForm";
import { BlogContent } from "@/components/custom/BlogContent";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Breadcrumb from "@/components/common/Breadcrumb";
import WhyChoose from "@/components/custom/WhyChoose";
import { Testimonial } from "@/components/custom/Testimonial";
import { TestiProps } from "@/components/custom/Testimonial";
import RelatedWebpage from "./RelatedWebpage";
import TrandingPkgSidebar from "./TrandingPkgSidebar";
import HelpfulResources from "@/components/custom/HelpfulResources";
import SocialShare from "./SocialSharing";
import { Share2 } from "lucide-react";

interface Faq {
  question: string;
  answer: string;
}
interface WebpageInterface {
  _id: string;
  title: string;
  content: string;
  slug: string;
  coverImage: {
    url: string;
    public_id: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  faqs?: Faq[];
  reviews?: TestiProps[];
  footerLinks?: [];
  fullSlug: string;
  excerpt: string;
  updatedAt: string;
  createdAt: string;
  views: number;
}
interface TrandingPkgInterface {
  _id: string;
  title: string;
  coverImage: {
    url: string;
    alt: string;
  };
  mainCategory: {
    slug: string;
  };
  slug: string;
  batch: {
    quad: number;
  }[];
  destination: {
    state: string;
  };
}

async function MainWebPage({
  page,
  relatedPage,
  pkg,
}: {
  page: WebpageInterface;
  relatedPage: WebpageInterface[];
  pkg?: TrandingPkgInterface[];
}) {
  return (
    <section className="">
      <Hero
        image={page?.coverImage?.url || "/Hero2.jpg"}
        title={page?.title || " "}
        height="lg"
        overlayOpacity={100}
      />
      <div className="w-full md:max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-5">
        <Breadcrumb />
      </div>
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-8 px-4 sm:px-6 lg:px-8 md:py-10 py-5">
        <article className="w-full md:w-2/3 space-y-10">
          {/* <header className="">
            <h1 className="text-3xl md:text-4xl font-bold"></h1>
          </header> */}
          <div className="border border-gray-400 px-4 py-8 flex gap-6 w-full rounded-md bg-gray-50">
            <p className="bg-[#FE5300] w-1 rounded-lg"></p>
            <p className="italic text-gray-500">{page.excerpt}</p>
          </div>
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
                  key={`faq-${i}`}
                  className="rounded-2xl shadow-lg p-4"
                >
                  <AccordionTrigger>{faq.question}</AccordionTrigger>
                  <AccordionContent className="text-justify">
                    <section className="prose prose-lg max-w-none">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {page.footerLinks && page.footerLinks.length > 0 && (
              <div className="mt-8 md:mt-10">
                <HelpfulResources data={page.footerLinks ?? []} />
              </div>
            )}
          </section>
          <div className="flex gap-3 mt-5">
            <p className="font-semibold ">
              Last Updated:{" "}
              <span className="text-gray-600">
                {new Date(page.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </p>
            <span className="relative group inline-block">
              {/* Social buttons (hidden until hover) */}
              <div className="absolute hidden group-hover:flex">
                <SocialShare
                  url={`https://musafirbaba.com/${page.fullSlug}`}
                  title={page.title}
                />
              </div>

              {/* Share icon */}
              <Share2 className="cursor-pointer" />
            </span>
          </div>
        </article>
        <aside className="w-full md:w-1/3 md:sticky md:top-10 self-start ">
          <QueryForm />
          {(pkg?.length || 0) > 0 && (
            <TrandingPkgSidebar pkgs={pkg ?? []} title="Related Packages" />
          )}
          {relatedPage.length > 0 && (
            <RelatedWebpage
              blogs={relatedPage}
              title="Related Pages"
              type="latest"
            />
          )}
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
