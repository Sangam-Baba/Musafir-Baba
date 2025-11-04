import { FeaturedTour } from "./FeaturedTour";

const CATEGORY_SLUGS = [
  { slug: "early-bird-2026", label: "Early Bird 2026" },
  { slug: "weekend-getaway", label: "Weekend Trips" },
  { slug: "backpacking-trips", label: "Backpacking Trips" },
  { slug: "religious-tour-package", label: "Religious-Trips" },
  { slug: "mountain-treks", label: "Mountain Treks" },
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
