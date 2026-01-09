import { notFound } from "next/navigation";
import CustomizedPackageClient from "./pageClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import { getProductSchema } from "@/lib/schema/product.schema";
import Script from "next/script";
async function getCustomizedPackage(slug: string, destination?: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/?slug=${slug}&destination=${destination}`,
    {
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data[0];
}

async function getRelatedPackages(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/related/${slug}`,
    {
      next: { revalidate: 600 },
    }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data?.data ?? [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ pkgSlug: string; destination: string }>;
}) {
  const { pkgSlug, destination } = await params;
  const pkg = await getCustomizedPackage(pkgSlug);

  if (!pkg) {
    return {
      title: "Package Not Found | Musafir Baba",
      description: "This customised tour package does not exist.",
      alternates: {
        canonical: `https://musafirbaba.com/holidays/customised-tour-packages/${pkgSlug}`,
      },
      openGraph: {
        title: "Package Not Found | Musafir Baba",
        description: "This customised tour package does not exist.",
      },
    };
  }

  const title = `${pkg.metaTitle || pkg.title}`;
  const description =
    pkg.metaDescription ||
    pkg.description ||
    "Explore this amazing tour package.";

  return {
    title,
    description,
    alternates: {
      canonical: pkg?.canonicalUrl
        ? `https://musafirbaba.com${pkg.canonicalUrl}`
        : `https://musafirbaba.com/holidays/customised-tour-packages/${destination}/${pkgSlug}`,
    },
    openGraph: {
      title,
      description,
      url: pkg?.canonicalUrl
        ? `https://musafirbaba.com${pkg.canonicalUrl}`
        : `https://musafirbaba.com/holidays/customised-tour-packages/${destination}/${pkgSlug}`,
      images: [
        {
          url:
            pkg?.coverImage?.url || "https://musafirbaba.com/homebanner.webp",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ pkgSlug: string; destination: string }>;
}) {
  const { pkgSlug, destination } = await params;
  const pkg = await getCustomizedPackage(pkgSlug, destination);
  const relatedPackages = await getRelatedPackages(pkgSlug);

  if (!pkg) {
    return notFound();
  }

  const breadcrumbSchema = getBreadcrumbSchema(
    "customised-tour-packages/" + pkg.destination.state + "/" + pkgSlug
  );

  const productSchema = getProductSchema(
    pkg.title,
    pkg.description,
    pkg?.plan?.price,
    "https://musafirbaba.com/holidays/customised-tour-packages/" +
      pkg.destination.state +
      "/" +
      pkgSlug
  );
  const faqSchema = getFAQSchema(pkg.faqs ?? []);
  const collectionSchema = getCollectionSchema(
    pkg.title,
    `https://musafirbaba.com/holidays/customised-tour-packages/${pkg.destination}/${pkgSlug}`,
    relatedPackages.map(
      (pkg: { slug: string; destination: { state: string } }) => ({
        url: `https://musafirbaba.com/holidays/customised-tour-packages/${pkg.destination.state}/${pkg.slug}`,
      })
    )
  );

  return (
    <>
      <CustomizedPackageClient pkg={pkg} relatedPackages={relatedPackages} />
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {pkg.schemaType?.includes("Product") && (
        <Script
          id="product-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
        />
      )}
      {pkg.schemaType?.includes("FAQ") && (
        <Script
          id="faq-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      {pkg.schemaType?.includes("Collection") && (
        <Script
          id="collection-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
        />
      )}
    </>
  );
}
