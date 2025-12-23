export const getWebPageSchema = (title: string, url: string) => ({
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: title,
  url: "https://musafirbaba.com/" + url,
});
