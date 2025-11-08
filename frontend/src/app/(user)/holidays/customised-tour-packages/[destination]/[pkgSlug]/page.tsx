// app/holidays/customized-tour-packages/[state]/[pkgSlug]/page.tsx

import CustomizedPackageClient from "./pageClient";
async function getCustomizedPackage(slug: string) {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/customizedtourpackage/slug/${slug}`,
    {
      cache: "no-cache",
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
      cache: "no-cache",
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
  const pkg = await getCustomizedPackage(params.pkgSlug);

  if (!pkg) {
    return {
      title: "Package Not Found | Musafir Baba",
      description: "This customized tour package does not exist.",
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
  const pkg = await getCustomizedPackage(params.pkgSlug);
  const relatedPackages = await getRelatedPackages(params.pkgSlug);

  if (!pkg) {
    // render 404 page
    return <h1 className="text-center text-2xl mt-20">Package not found</h1>;
  }

  return (
    <CustomizedPackageClient pkg={pkg} relatedPackages={relatedPackages} />
  );
}
