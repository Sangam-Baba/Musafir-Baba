export const getNewsSchema = (
  title: string,
  createdAt: string,
  updatedAt: string,
  author: string
) => {
  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: title,
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
  };
};
