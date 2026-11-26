import Hero from "@/components/custom/Hero";
import Breadcrumb from "@/components/common/Breadcrumb";
import PageFaqs from "@/components/common/PageFaqs";
import { BlogContent } from "@/components/custom/BlogContent";
import MBGoSearchWidget from "@/components/mbgo/MBGoSearchWidget";
import { specialRentalHeading, type SpecialRentalPageData } from "@/lib/rentalSpecial";
import SpecialRentalAuthor from "./SpecialRentalAuthor";

// Layout of /rental/{location}/{special-type}[/{slug}]: one banner, the same
// ride search as /mbgo (start point + where to filled in by the admin, the
// visitor can change both; results open the same /mbgo/vehicles cards), then
// the page content, FAQs and author.
export default function SpecialRentalPage({ page }: { page: SpecialRentalPageData }) {
  const heading = specialRentalHeading(page);
  return (
    <main>
      <Hero
        image={page.bannerImage?.url || "/assets/images/cars/car-banner.png"}
        title={heading}
      />

      <div className="relative z-20 -mt-10 md:-mt-16 px-4 md:px-8">
        <MBGoSearchWidget initialPickup={page.searchFrom} initialDrop={page.searchTo} />
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mt-6">
        <Breadcrumb title={heading} />

        {page.content && (
          <section className="visa-prose prose prose-base max-w-none text-black leading-relaxed prose-ul:pl-5 prose-ol:pl-5 prose-li:my-0 prose-p:mb-4 mt-6 mb-10">
            <BlogContent html={page.content} />
          </section>
        )}
      </div>

      <PageFaqs faqs={page.faqs} />

      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 mb-12">
        <SpecialRentalAuthor author={page.author} updatedAt={page.updatedAt} />
      </div>
    </main>
  );
}
