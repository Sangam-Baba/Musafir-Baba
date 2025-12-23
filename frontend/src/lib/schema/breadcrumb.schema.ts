export function getBreadcrumbSchema(slug: string) {
  const pathSegments = slug.split("/").filter(Boolean);

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

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "@id": `https://musafirbaba.com/${slug}#breadcrumb`,
    itemListElement: itemList,
  };
}
