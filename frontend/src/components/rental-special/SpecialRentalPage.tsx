import Hero from "@/components/custom/Hero";
import PageFaqs from "@/components/common/PageFaqs";
import { specialRentalHeading, type SpecialRentalPageData } from "@/lib/rentalSpecial";
import SpecialRentalBody from "./SpecialRentalBody";

// Layout of /rental/{location}/{special-type}[/{slug}]: a short banner, the
// ride search with the price table (prices load at once for the admin's
// start point + where to), then content | minimum price + enquiry form, FAQs.
export default function SpecialRentalPage({ page }: { page: SpecialRentalPageData }) {
  return (
    <main>
      <Hero
        image={page.bannerImage?.url || "/assets/images/cars/car-banner.png"}
        title={specialRentalHeading(page)}
        aspectRatio="h-[220px] md:h-[300px]"
      />
      <SpecialRentalBody page={page} />
      <PageFaqs faqs={page.faqs} />
    </main>
  );
}
