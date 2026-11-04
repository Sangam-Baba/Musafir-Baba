import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface SubDestinationCard {
  _id: string;
  name: string;
  slug: string;
  coverImage?: { url?: string; alt?: string };
}

// Compact sub-destination links shown on a parent /destinations/{slug} page
export default function SubDestinationGrid({
  parentSlug,
  parentName,
  items,
}: {
  parentSlug: string;
  parentName: string;
  items: SubDestinationCard[];
}) {
  if (!items.length) return null;

  return (
    <section className="w-full md:max-w-7xl mx-auto px-4 md:px-8 lg:px-10 mt-10">
      <h2 className="text-xl md:text-2xl font-semibold text-gray-900">
        Places to Explore in {parentName}
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Choose a place to see its packages.
      </p>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => (
          <Link
            key={item._id}
            href={`/destinations/${parentSlug}/${item.slug}`}
            className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-2 pr-3 transition-all duration-300 hover:border-[#FE5300]/40 hover:shadow-md"
          >
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-gray-100">
              <Image
                src={item.coverImage?.url || "/Heroimg.jpg"}
                alt={item.coverImage?.alt || item.name}
                fill
                sizes="56px"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                draggable={false}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-gray-900 group-hover:text-[#FE5300] transition-colors">
                {item.name}
              </p>
              <p className="text-xs text-gray-500">View packages</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-400 transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-[#FE5300]" />
          </Link>
        ))}
      </div>
    </section>
  );
}
