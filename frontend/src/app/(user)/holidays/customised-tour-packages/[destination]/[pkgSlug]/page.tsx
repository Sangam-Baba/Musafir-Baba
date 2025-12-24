import { notFound } from "next/navigation";
import CustomizedPackageClient from "./pageClient";
import { getBreadcrumbSchema } from "@/lib/schema/breadcrumb.schema";
import { getCollectionSchema } from "@/lib/schema/collection.schema";
import { getFAQSchema } from "@/lib/schema/faq.schema";
import { getProductSchema } from "@/lib/schema/product.schema";
import Script from "next/script";
async function getCustomizedPackage(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/slug/${slug}`,
    {
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data?.data;
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
  params: { pkgSlug: string };
}) {
  const { pkgSlug } = await params;
  const pkg = await getCustomizedPackage(pkgSlug);

  if (!pkg) {
    return {
      title: "Package Not Found | Musafir Baba",
      description: "This customised tour package does not exist.",
    };
  }

  const title = `${pkg.metaTitle || pkg.title} | Musafir Baba`;
  const description =
    pkg.metaDescription ||
    pkg.description ||
    "Explore this amazing tour package.";

  return {
    title,
    description,
    alternates: {
      canonical: `https://musafirbaba.com/holidays/customised-tour-packages/${pkg.destination}/${params.pkgSlug}`,
    },
    openGraph: {
      title,
      description,
      images: [{ url: pkg?.coverImage?.url || "/logo.svg" }],
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
  params: { pkgSlug: string };
}) {
  const { pkgSlug } = await params;
  const pkg = await getCustomizedPackage(pkgSlug);
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
