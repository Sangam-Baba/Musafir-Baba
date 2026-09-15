import HeroSearchWidget from "@/components/custom/HeroSearchWidget";

// Same `/category` endpoint holidays/page.tsx and TravelMoodSection.tsx
// already fetch (Next.js dedupes identical fetch calls, so this doesn't add
// a real extra network round-trip) — feeds the hero search widget's
// Holidays "Package Type" dropdown with real category slugs.
async function getHeroCategories(): Promise<{ id: string; name: string; slug: string }[]> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/category`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data?.data ?? []).map((c: { _id: string; name: string; slug: string }) => ({
    id: c._id,
    name: c.name,
    slug: c.slug,
  }));
}

// Dedicated `/vehicle/filters` endpoint (returns just the distinct vehicle
// types + locations, already lowercased/deduped server-side the same way
// RentalsClient.tsx's own Category dropdown normalizes vehicleType) — much
// lighter than fetching every published vehicle's full document via
// `/vehicle/all` just to derive these two small lists.
async function getHeroVehicleFilters(): Promise<{
  types: string[];
  locations: { id: string; name: string }[];
}> {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/vehicle/filters`, {
    next: { revalidate: 300 },
  });
  if (!res.ok) return { types: [], locations: [] };
  const data = await res.json();
  return data?.data ?? { types: [], locations: [] };
}

// Isolates the two data fetches behind their own async Server Component so
// they can be wrapped in a <Suspense> boundary in page.tsx — the hero image
// and heading no longer have to wait on these before the browser gets any
// HTML. The widget's own rendering/props are completely unchanged from
// before this file existed; only when its data is allowed to arrive is
// different.
export default async function HeroSearchWidgetServer() {
  const [heroCategories, heroVehicleFilters] = await Promise.all([
    getHeroCategories(),
    getHeroVehicleFilters(),
  ]);

  return <HeroSearchWidget categories={heroCategories} vehicleFilters={heroVehicleFilters} />;
}

// Matches HeroSearchWidget's own outer wrapper classes and rough internal
// layout (tabs row, 4-field grid, submit button) so there's no layout shift
// when the real widget replaces it. Since the underlying fetches are cached
// for 5 minutes, this will rarely be visible in practice.
export function HeroSearchWidgetFallback() {
  return (
    <div className="w-full max-w-[560px] sm:max-w-[640px] lg:max-w-[720px] bg-white rounded-2xl shadow-xl p-4 md:p-5 relative z-20 mt-4 md:mt-6 mb-4">
      <div className="flex items-center gap-1.5 mb-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 rounded-lg bg-gray-100 animate-pulse flex-shrink-0" />
        ))}
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="flex flex-col gap-1.5 col-span-2 lg:col-span-1">
          <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-gray-100 animate-pulse" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
            <div className="h-10 w-full rounded-md bg-gray-100 animate-pulse" />
          </div>
        ))}
      </div>
      <div className="h-10 w-full rounded-lg bg-gray-100 animate-pulse" />
    </div>
  );
}
