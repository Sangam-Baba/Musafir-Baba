import { FeaturedTour } from "./FeaturedTour";

const CATEGORY_SLUGS = [
  { slug: "early-bird-2026", label: "Early Bird 2026" },
  { slug: "weekend-getaway", label: "Weekend Trips" },
  { slug: "backpacking-trips", label: "Backpacking Trips" },
  { slug: "religious-tour-package", label: "Religious Trips" },
  { slug: "mountain-treks", label: "Mountain Treks" },
];

async function getPackageByCategorySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/category/${slug}`,
    {
      cache: "no-cache",
    }
  );
  if (!res.ok) throw new Error("Failed to fetch packages");
  const data = await res.json();
  return data?.data ?? [];
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
