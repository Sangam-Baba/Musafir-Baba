import type { Metadata } from "next";
import { rentalSlug } from "@/lib/rentalUrl";

// Special rental pages: /rental/{location}/{special-type}[/{slug}].
// The rental pages call getSpecialRentalPage() only when their own lookup
// found nothing (or is about to redirect), so working vehicle URLs never wait
// on it. Any failure (404, error, slow backend) returns null and the page
// carries on exactly as before.

export interface SpecialSearchPoint {
  address?: string;
  lat?: number;
  lng?: number;
}

export interface SpecialRentalAuthor {
  name: string;
  role?: string;
  about?: string;
  avatar?: { url?: string };
}

export interface SpecialRentalPageData {
  _id: string;
  slug: string;
  title?: string;
  bannerImage?: { url?: string; alt?: string };
  content?: string;
  searchFrom?: SpecialSearchPoint;
  searchTo?: SpecialSearchPoint;
  metaTitle?: string;
  metaDescription?: string;
  keywords?: string[];
  faqs?: { question?: string; answer?: string }[];
  author?: SpecialRentalAuthor | null;
  updatedAt?: string;
  location: { _id: string; name: string; slug?: string };
  specialType: { _id: string; name: string; slug: string };
}

const LOOKUP_TIMEOUT_MS = 4000;

export async function getSpecialRentalPage(
  location: string,
  type: string,
  slug = "",
): Promise<SpecialRentalPageData | null> {
  try {
    const qs = new URLSearchParams({ location, type, slug });
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/rental-special/lookup?${qs}`, {
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.data ?? null;
  } catch {
    return null;
  }
}

export function specialRentalPath(page: SpecialRentalPageData): string {
  const loc = rentalSlug(page.location?.slug) || rentalSlug(page.location?.name) || "any";
  const base = `/rental/${loc}/${page.specialType.slug}`;
  return page.slug ? `${base}/${page.slug}` : base;
}

export function specialRentalHeading(page: SpecialRentalPageData): string {
  return page.title || `${page.specialType.name} in ${page.location.name}`;
}

// Same fields and rules as the other rental pages: own title/description,
// keywords, and a canonical that always points at this page's own URL.
export function specialRentalMetadata(page: SpecialRentalPageData): Metadata {
  const heading = specialRentalHeading(page);
  return {
    title: page.metaTitle || `${heading} - MusafirBaba`,
    description:
      page.metaDescription ||
      `Book ${page.specialType.name.toLowerCase()} in ${page.location.name} with MusafirBaba. Compare options and fares, and book online.`,
    keywords: page.keywords?.length ? page.keywords.join(", ") : undefined,
    alternates: {
      canonical: `https://musafirbaba.com${specialRentalPath(page)}`,
    },
  };
}
