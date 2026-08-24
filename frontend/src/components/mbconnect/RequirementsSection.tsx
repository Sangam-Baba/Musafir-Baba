import Image from "next/image";
import { CheckCircle2 } from "lucide-react";

const REQUIREMENTS = [
  "Car, SUV, Sedan, Hatchback & More",
  "Valid Driving License",
  "RC in Your Name / NOC",
  "Insurance & PUC Certificate",
  "Smartphone with Internet",
];

export default function RequirementsSection() {
  return (
    <section id="requirements" className="w-full px-4 md:px-8 py-14 md:py-20 scroll-mt-16">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-10 items-center">
        <div>
          <h2 className="text-2xl md:text-[32px] leading-tight font-bold text-gray-900">
            Who Can Join <span className="text-[#FE5300]">MBConnect</span>?
          </h2>
          <p className="text-[14px] md:text-[15px] text-gray-500 mt-2 max-w-md">
            We welcome all professional drivers and vehicle owners.
          </p>

          <ul className="flex flex-col gap-3 mt-6">
            {REQUIREMENTS.map((item) => (
              <li key={item} className="flex items-center gap-2.5 text-[14px] text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-[#FE5300] flex-shrink-0" strokeWidth={2} />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* aspect-[1455/655] is intentionally a touch shorter than the
            source image's real 1455x677 — combined with object-bottom this
            crops ~22px off the very top, which removes a thin dark line
            baked into that top edge of the source file (present in the
            asset itself, not introduced by this crop) while leaving all of
            the actual illustration (car + skyline) untouched. */}
        <div className="relative w-full overflow-hidden aspect-[1455/655]">
          <Image
            src="/partner/mbconnectsectionimage1.avif"
            alt="Drive any vehicle with MBConnect — car, SUV, sedan or hatchback"
            fill
            className="object-cover object-bottom"
          />
        </div>
      </div>
    </section>
  );
}
