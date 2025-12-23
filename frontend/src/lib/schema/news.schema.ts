export const getNewsSchema = (
  title: string,
  description: string,
  slug: string,
  img: string,
  createdAt: string,
  updatedAt: string,
  author: string
) => {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
    description: description,
    image: img || "https://musafirbaba.com/logo.svg",
    datePublished: createdAt,
    dateModified: updatedAt,
    author: {
      "@type": "Organization",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "MusafirBaba",
      logo: {
        "@type": "ImageObject",
        url: "https://musafirbaba.com/logo.svg",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://musafirbaba.com/news/${slug}`,
    },
  };
};
