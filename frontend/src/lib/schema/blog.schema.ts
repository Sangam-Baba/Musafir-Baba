export const getBlogSchema = (
  title: string,
  description: string,
  slug: string,
  img: string,
  createdAt: string,
  updatedAt: string,
  author: string
) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  heading: title,
  description: description,
  image: img || "https://musafirbaba.com/logo.svg",
  datePublished: createdAt,
  dateModified: updatedAt,
  author: {
    "@type": "Person",
    name: author,
  },
  mainEntityOfPage: {
    "@type": "WebPage",
    "@id": `https://musafirbaba.com/blog/${slug}`,
  },
});
