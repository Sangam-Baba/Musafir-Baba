export const getBlogSchema = (
  title: string,
  createdAt: string,
  updatedAt: string,
  author: string
) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  heading: title,
  datePublished: createdAt,
  dateModified: updatedAt,
  author: {
    "@type": "Person",
    name: author,
  },
});
