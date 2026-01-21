// Import Swiper React components
import { Swiper, SwiperSlide } from "swiper/react";

// Import Swiper styles
import "swiper/css";
import "swiper/css/effect-cards";

// import "./styles.css";

// import required modules
import { EffectCards } from "swiper/modules";
import PackageCard from "./PackageCard";
import { GroupPackageInterface } from "@/app/(user)/holidays/[categorySlug]/[destination]/[packageSlug]/page";

function EffectCardRelatedPackages({
  pkgs,
}: {
  pkgs: GroupPackageInterface[];
}) {
  return (
    <div className="md:hidden block">
      <Swiper
        effect={"cards"}
        grabCursor={true}
        modules={[EffectCards]}
        className="w-[260px] h-[360px] "
      >
        {pkgs.map((pkg: GroupPackageInterface) => (
          <SwiperSlide key={pkg._id} className="rounded-lg">
            <PackageCard
              key={pkg._id}
              pkg={{
                id: pkg._id,
                name: pkg.title,
                slug: pkg.slug,
                image: pkg.coverImage ? pkg.coverImage.url : "",
                price: pkg.batch ? pkg.batch[0]?.quad : 9999,
                duration: `${pkg.duration.nights}N/${pkg.duration.days}D`,
                destination:
                  pkg.destination?.name ?? pkg.destination?.state ?? "",
                batch: pkg?.batch ? pkg?.batch : [],
              }}
              url={`/holidays/${pkg?.mainCategory?.slug}/${pkg?.destination?.slug}/${pkg.slug}`}
            />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}

export default EffectCardRelatedPackages;
