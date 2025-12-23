export const getCollectionSchema = (
  title: string,
  url: string,
  items: { url: string }[]
) => ({
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: title,
  url,
  mainEntity: {
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: item.url,
    })),
  },
});
