import Hero from "@/components/custom/Hero";
import { BlogContent } from "@/components/custom/BlogContent";
import QuickFactsGrid from "./QuickFactsGrid";
import QuickAnswersList from "./QuickAnswersList";
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
import { Share2, Trophy, Medal, Star, Facebook, Twitter, Instagram, Linkedin } from "lucide-react";
import { TableOfContents } from "@/components/custom/TableOfContents";
import { Heading } from "@/utils/blogUtils";

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
  quickSummary?: string;
  quickFacts?: string;
  quickAnswers?: string;
  faqs?: Faq[];
  reviews?: TestiProps[];
  footerLinks?: [];
  helpfulResources?: { title: string; url: string }[];
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
  headings = [],
  contentWithIds = "",
}: {
  page: WebpageInterface;
  relatedPage: WebpageInterface[];
  pkg?: TrandingPkgInterface[];
  headings?: Heading[];
  contentWithIds?: string;
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
        <Breadcrumb title={page.title} />
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


          {page.quickSummary && page.quickSummary.trim() !== "" && page.quickSummary !== "<p><br></p>" && (
            <div className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
              <div className="flex flex-col gap-2 mb-5">
                <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Quick Summary</h2>
                <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
              </div>
              <div className="prose prose-base max-w-none text-gray-600 leading-relaxed">
                <BlogContent html={page.quickSummary} />
              </div>
            </div>
          )}

          {page.quickFacts && page.quickFacts.trim() !== "" && page.quickFacts !== "<p><br></p>" && (
            <div className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
              <div className="flex flex-col gap-2 mb-5">
                <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Quick Facts</h2>
                <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
              </div>
              <QuickFactsGrid html={page.quickFacts} />
            </div>
          )}

          {page.quickAnswers && page.quickAnswers.trim() !== "" && page.quickAnswers !== "<p><br></p>" && (
            <div className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
              <div className="flex flex-col gap-2 mb-5">
                <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">Quick Answers</h2>
                <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
              </div>
              <QuickAnswersList html={page.quickAnswers} />
            </div>
          )}

          <div className="scroll-mt-40 mb-8 pb-8 border-b border-gray-200 last:border-0">
            <div className="prose prose-base max-w-none text-gray-600 leading-relaxed">
              <BlogContent html={contentWithIds || page.content} />
            </div>
          </div>

          <section>
            <div className="flex flex-col gap-2 mb-5">
              <h2 className="text-2xl md:text-3xl font-bold font-heading text-black">{`FAQ's`}</h2>
              <div className="w-12 h-1 bg-[#FE5300] rounded-full"></div>
            </div>
            <Accordion type="single" collapsible className="w-full space-y-2">
              {page?.faqs?.map((faq: Faq, i: number) => (
                <AccordionItem
                  value={`faq-${i}`}
                  key={`faq-${i}`}
                  className="border-b border-gray-200 py-1 md:py-2"
                >
                  <AccordionTrigger className="text-xs md:text-sm font-bold font-heading text-black hover:text-[#FE5300] transition-colors hover:no-underline text-left">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-justify pt-3">
                    <section className="prose prose-sm max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4">
                      <BlogContent html={faq.answer} />
                    </section>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>

          {/* Author Information */}
          <div id="author" className="scroll-mt-40 mb-8 mt-10">
            <div className="bg-orange-50/40 rounded-2xl p-6 md:p-8 border border-orange-100 flex flex-col gap-3 shadow-sm">
              <h4 className="text-lg md:text-xl font-bold font-heading text-gray-900">Author Information</h4>
              <div className="flex flex-col gap-2 text-gray-600 text-sm md:text-base">
                <p><span className="font-semibold text-gray-800">Written By:</span> MusafirBaba Travel Team</p>
                <p><span className="font-semibold text-gray-800">Reviewed By:</span> Destination Specialist</p>
                <p><span className="font-semibold text-gray-800">Last Updated:</span> {new Date(page.updatedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}</p>
              </div>
            </div>
          </div>

          <section>
            {page.footerLinks && page.footerLinks.length > 0 && (
              <div className="mb-8">
                <HelpfulResources data={page.footerLinks ?? []} />
              </div>
            )}
            {page.helpfulResources && page.helpfulResources.length > 0 && (
              <div className="mb-8">
                <HelpfulResources data={page.helpfulResources} />
              </div>
            )}
            
            {relatedPage.length > 0 && (
              <div className="mb-8">
                <RelatedWebpage
                  blogs={relatedPage}
                  title="Related Pages"
                  type="latest"
                />
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
          <div className="hidden md:block">
            <TableOfContents headings={headings} />
          </div>

          {/* Social Connect & Trusted Badges */}
          <div className="mt-8 pt-6 border-t border-gray-100 hidden md:block space-y-8">
            <div className="space-y-4">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Connect With Us</h3>
              <div className="flex items-center gap-3">
                <a href="https://facebook.com/musafirbaba" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#1877F2] hover:text-white transition-colors border border-gray-100 shadow-sm">
                  <Facebook size={18} />
                </a>
                <a href="https://instagram.com/musafirbaba" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#E4405F] hover:text-white transition-colors border border-gray-100 shadow-sm">
                  <Instagram size={18} />
                </a>
                <a href="https://twitter.com/musafirbaba" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#1DA1F2] hover:text-white transition-colors border border-gray-100 shadow-sm">
                  <Twitter size={18} />
                </a>
                <a href="https://linkedin.com/company/musafirbaba" target="_blank" rel="noopener noreferrer" className="h-10 w-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-600 hover:bg-[#0A66C2] hover:text-white transition-colors border border-gray-100 shadow-sm">
                  <Linkedin size={18} />
                </a>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Why Choose Us</h3>
              
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100/30 border border-orange-100/50 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Trophy className="w-5 h-5 text-[#FE5300]" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-[#FE5300] uppercase tracking-widest leading-none mb-1">Award Winning</span>
                  <span className="text-[13px] font-bold text-gray-800 leading-tight">Best Tour & Travel Company</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100/30 border border-blue-100/50 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Medal className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-1">Top Rated</span>
                  <span className="text-[13px] font-bold text-gray-800 leading-tight">Best Visa Company In India</span>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100/30 border border-emerald-100/50 shadow-sm group hover:shadow-md transition-all duration-300">
                <div className="h-10 w-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Star className="w-5 h-5 text-emerald-500 fill-emerald-500" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest leading-none mb-1">5 Star Rated</span>
                  <span className="text-[13px] font-bold text-gray-800 leading-tight">Loved by 10k+ Explorers</span>
                </div>
              </div>
            </div>
          </div>
          {(pkg?.length || 0) > 0 && (
            <TrandingPkgSidebar pkgs={pkg ?? []} title="Related Packages" />
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
