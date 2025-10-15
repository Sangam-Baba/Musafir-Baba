import { Metadata } from "next";
import SingleCategoryPage from "./PackageSlugClient";
import Script from "next/script";

interface Props {
  params: { slug: string };
}
interface Batch {
  _id: string;
  startDate: string;
  endDate: string;
  quad: number;
  triple: number;
  double: number;
  child: number;
  quadDiscount: number;
  tripleDiscount: number;
  doubleDiscount: number;
  childDiscount: number;
}
interface CoverImage {
  url: string;
  public_id: string;
  width: number;
  height: number;
  alt: string;
}
interface Itinerary {
  day: number;
  title: string;
  description: string;
}
interface Package {
  _id: string;
  description: string;
  title: string;
  metaDescription: string;
  slug: string;
  coverImage: CoverImage;
  batch: Batch[];
  duration: {
    days: number;
    nights: number;
  };
  itinerary: Itinerary[];
  destination: Destination;
  isFeatured: boolean;
  status: "draft" | "published";
}
interface Destination {
  _id: string;
  country: string;
  state: string;
  name: string;
  slug: string;
  city: string;
}
async function getCategoryBySlug(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/category/${slug}`,
    {
      method: "GET",
      headers: { "content-type": "application/json" },
      credentials: "include",
      cache: "no-cache",
    }
  );
  if (!res.ok) {
    throw new Error("Failed to fetch category");
  }
  return res.json();
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = params;
  try {
    const res = await getCategoryBySlug(slug);
    const { category } = res?.data ?? {};
    const packages = category?.packages ?? [];
    console.log("packages", packages);
    console.log("Category", category);

    if (!category) {
      return {
        title: "Category Not Found | Musafir Baba",
        description: "This travel category does not exist.",
      };
    }

    const title = `${category.name} | Musafir Baba`;
    const description =
      category.description || "Explore the best travel packages.";

    return {
      title,
      description,
      alternates: {
        canonical: `https://musafirbaba.com/packages/${slug}`,
      },
      openGraph: {
        title,
        description,
        url: `https://musafirbaba.com/packages/${slug}`,
        images: [
          {
            url:
              category.coverImage.url ||
              "https://musafirbaba.com/default-og.jpg",
            width: 1200,
            height: 630,
            alt: category.name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [category.coverImage.url || "https://musafirbaba.com/logo.svg"],
      },
    };
  } catch {
    return {
      title: "Error | Musafir Baba",
      description: "Failed to fetch category.",
    };
  }
}
export default async function Page({ params }: Props) {
  const res = await getCategoryBySlug(params.slug);
  const { category } = res?.data ?? {};
  const packages = category?.packages ?? [];

  // ✅ Build JSON-LD Schema
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${category?.name} Travel Packages`,
    description: category?.description,
    url: `https://musafirbaba.com/packages/${params.slug}`,
    numberOfItems: packages.length,
    itemListElement: packages.map((pkg: Package, index: number) => ({
      "@type": "TouristTrip",
      position: index + 1,
      name: pkg.title,
      description: pkg.description || pkg.metaDescription || "",
      image: pkg.coverImage?.url,
      url: `https://musafirbaba.com/${pkg.destination?.country}/${pkg.destination?.state}/${pkg.slug}`,
      tourType: "GroupTour",
      itinerary: pkg.itinerary?.map((day: Itinerary, i: number) => ({
        "@type": "TouristAttraction",
        position: i + 1,
        name: day.title,
        description: day.description,
      })),
      offers: {
        "@type": "Offer",
        price: pkg.batch?.[0]?.quad || 9999,
        priceCurrency: "INR",
        availability: "https://schema.org/InStock",
        url: `https://musafirbaba.com/${pkg.destination?.country}/${pkg.destination?.state}/${pkg.slug}`,
      },
      location: {
        "@type": "Place",
        name: pkg.destination?.name,
        address: {
          "@type": "PostalAddress",
          addressCountry: pkg.destination?.country,
          addressRegion: pkg.destination?.state,
          addressLocality: pkg.destination?.city,
        },
      },
    })),
  };
  return (
    <>
      <SingleCategoryPage slug={params.slug} />
      <Script id="json-schema" type="application/ld+json">
        {JSON.stringify(schema)}
      </Script>
    </>
  );
}
