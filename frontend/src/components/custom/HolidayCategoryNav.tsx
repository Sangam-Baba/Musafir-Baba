import CategoryPillsNav, { CategoryPillItem } from "@/components/custom/CategoryPillsNav";

const BASE = process.env.NEXT_PUBLIC_BASE_URL;

// Never throws: any failure just yields an empty list.
async function fetchList(path: string): Promise<any[]> {
  try {
    const res = await fetch(`${BASE}${path}`, { next: { revalidate: 120 } });
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.data) ? json.data : [];
  } catch {
    return [];
  }
}

// Category pills for the category listing pages (/holidays/{slug}, ...).
// Counts are built the same way as on /holidays: group packages by their
// mainCategory, plus every customised package under "customised-tour-packages".
// If anything fails it renders nothing, so the page itself is unaffected.
export default async function HolidayCategoryNav({ activeSlug }: { activeSlug: string }) {
  try {
    const [categories, groupPkgs, customPkgs] = await Promise.all([
      fetchList("/category"),
      fetchList("/packages"),
      fetchList("/customizedtourpackage"),
    ]);

    const counts = new Map<string, number>();
    groupPkgs.forEach((pkg) => {
      const slug = pkg?.mainCategory?.slug?.toLowerCase();
      if (slug) counts.set(slug, (counts.get(slug) ?? 0) + 1);
    });
    if (customPkgs.length > 0) {
      counts.set(
        "customised-tour-packages",
        (counts.get("customised-tour-packages") ?? 0) + customPkgs.length,
      );
    }

    const active = activeSlug.toLowerCase();
    const items: CategoryPillItem[] = categories
      .filter(
        (cat) =>
          cat?.slug &&
          (counts.has(cat.slug.toLowerCase()) || cat.slug.toLowerCase() === active),
      )
      .map((cat) => ({
        _id: cat._id,
        name: cat.name,
        slug: cat.slug,
        count: counts.get(cat.slug.toLowerCase()) ?? 0,
      }));

    if (items.length === 0) return null;
    return (
      <CategoryPillsNav
        categories={items}
        activeSlug={activeSlug}
        totalCount={groupPkgs.length + customPkgs.length}
      />
    );
  } catch {
    return null;
  }
}
