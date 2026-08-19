import TravelMoodCarousel from "./TravelMoodCarousel";

export interface MoodCategory {
  id: string;
  name: string;
  slug: string;
  coverImage: { url: string; alt: string };
}

// Same fetch pattern as src/app/(user)/holidays/page.tsx's getCategory() —
// the one real, canonical categories endpoint, already used elsewhere.
async function getCategories(): Promise<MoodCategory[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data ?? [])
    .filter((c: { isActive?: boolean }) => c.isActive !== false)
    .map((c: { _id: string; name: string; slug: string; coverImage?: { url: string; alt: string } }) => ({
      id: c._id,
      name: c.name,
      slug: c.slug,
      coverImage: c.coverImage ?? { url: "", alt: c.name },
    }));
}

export default async function TravelMoodSection() {
  const categories = await getCategories();
  if (categories.length === 0) return null;

  return (
    <section className="w-full px-4 md:px-10 py-8 md:py-10">
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-[32px] leading-tight font-medium text-gray-900">
          Choose your <span className="text-[#FE5300]">travel mood</span>
        </h2>
        <p className="text-[14px] md:text-[16px] text-gray-600 mt-1">
          Real packages, grouped by the kind of trip you&apos;re after.
        </p>
      </div>
      <TravelMoodCarousel categories={categories} />
    </section>
  );
}
