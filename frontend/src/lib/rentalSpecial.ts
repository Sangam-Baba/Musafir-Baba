import type { Metadata } from "next";

// Special rental pages: /rental/{special-type}[/{slug}] (no city).
// The rental pages call getSpecialRentalPage() only where they would otherwise
// show Not Found, so working vehicle / type / city URLs never wait on it.
// Any failure (404, error, slow backend) returns null and the page carries on
// exactly as before.

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
  specialType: { _id: string; name: string; slug: string };
}

const LOOKUP_TIMEOUT_MS = 4000;

export async function getSpecialRentalPage(type: string, slug = ""): Promise<SpecialRentalPageData | null> {
  try {
    const qs = new URLSearchParams({ type, slug });
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
  const base = `/rental/${page.specialType.slug}`;
  return page.slug ? `${base}/${page.slug}` : base;
}

export function specialRentalHeading(page: SpecialRentalPageData): string {
  return page.title || page.specialType.name;
}

// Same fields and rules as the other rental pages: own title/description,
// keywords, and a canonical that always points at this page's own URL.
export function specialRentalMetadata(page: SpecialRentalPageData): Metadata {
  const heading = specialRentalHeading(page);
  return {
    title: page.metaTitle || `${heading} - MusafirBaba`,
    description:
      page.metaDescription ||
      `Book ${page.specialType.name.toLowerCase()} with MusafirBaba. Compare options and fares, and book online.`,
    keywords: page.keywords?.length ? page.keywords.join(", ") : undefined,
    alternates: {
      canonical: `https://musafirbaba.com${specialRentalPath(page)}`,
    },
  };
}
