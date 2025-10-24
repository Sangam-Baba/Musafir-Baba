"use client";

import { usePathname } from "next/navigation";
import Head from "next/head";

export default function BreadcrumbSEO() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  const itemList = [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://musafirbaba.com/",
    },
    ...pathSegments.map((seg, i) => ({
      "@type": "ListItem",
      position: i + 2,
      name: seg
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" "),
      item: `https://musafirbaba.com/${pathSegments.slice(0, i + 1).join("/")}`,
    })),
  ];

  return (
    <Head>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: itemList,
          }),
        }}
      />
    </Head>
  );
}
