import { FeaturedTour } from "./FeaturedTour";

const CATEGORY_SLUGS = [
  { slug: "customized-tour-package", label: "Customized Trips" },
  { slug: "backpacking-trips", label: "Backpacking Trips" },
  { slug: "weekend-getaway", label: "Weekend Trips" },
  { slug: "honeymoon-package", label: "Honeymoon Trips" },
  { slug: "early-bird-2026", label: "Early Bird 2026" },
  { slug: "international-tour-packages", label: "International Trips" },
];

async function getCategory(slug: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/category/${slug}`,
      {
        next: { revalidate: 86400 }, // revalidate once a day
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.category || null;
  } catch {
    return null;
  }
}

export default async function FeaturedTourSSG() {
  const categories = await Promise.all(
    CATEGORY_SLUGS.map(async (tab) => ({
      ...tab,
      category: await getCategory(tab.slug),
    }))
  );

  return <FeaturedTour categories={categories} />;
}
