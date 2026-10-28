import { FeaturedTour } from "./FeaturedTour";
import { apiTimeoutSignal } from "@/lib/apiTimeout";

const CATEGORY_SLUGS = [
  { slug: "early-bird", label: "Early Bird 2026" },
  { slug: "weekend-getaways", label: "Weekend Trips" },
  { slug: "backpacking-trips", label: "Backpacking Trips" },
  { slug: "religious-tours", label: "Religious Trips" },
  { slug: "mountain-treks", label: "Mountain Treks" },
];

// Never throws: a failed/dropped request renders that tab empty instead of
// failing the "/" prerender (and with it the whole build). revalidate refills it.
async function getPackageByCategorySlug(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/packages/category/${slug}?limit=12&minimal=true`,
      {
        next: { revalidate: 60, tags: ['packages'] },
        signal: apiTimeoutSignal(),
      }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return data?.data ?? [];
  } catch (error) {
    console.error(`Failed to fetch packages for category "${slug}":`, error);
    return [];
  }
}

export default async function FeaturedTourSSG() {
  const packages = await Promise.all(
    CATEGORY_SLUGS.map(async (tab) => ({
      ...tab,
      categoryPackages: await getPackageByCategorySlug(tab.slug),
    }))
  );

  return <FeaturedTour categoriesPkg={packages} />;
}
