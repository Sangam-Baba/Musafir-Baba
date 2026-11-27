import Hero from "@/components/custom/Hero";
import PageFaqs from "@/components/common/PageFaqs";
import {
  getSpecialDefaultQuote,
  getSpecialRentalPage,
  specialRentalHeading,
  specialRentalPath,
  type SpecialRentalPageData,
} from "@/lib/rentalSpecial";
import SpecialRentalBody from "./SpecialRentalBody";

// Layout of /rental/{special-type}[/{slug}]: a short banner, the ride search
// with the price table (default route priced on the server, see
// getSpecialDefaultQuote), then content | minimum price + enquiry form, FAQs.
export default async function SpecialRentalPage({ page }: { page: SpecialRentalPageData }) {
  // Not awaited: streamed to the browser when ready, the page renders at once
  const initialQuote = getSpecialDefaultQuote(page);

  // Detail pages link the special type crumb to its landing page, if any
  const landing = page.slug ? await getSpecialRentalPage(page.specialType.slug) : null;

  return (
    <main>
      <Hero
        image={page.bannerImage?.url || "/assets/images/cars/car-banner.png"}
        title={specialRentalHeading(page)}
        aspectRatio="h-[220px] md:h-[300px]"
      />
      <SpecialRentalBody
        page={page}
        initialQuote={initialQuote}
        typeHref={landing ? specialRentalPath(landing) : undefined}
      />
      <PageFaqs faqs={page.faqs} />
    </main>
  );
}
