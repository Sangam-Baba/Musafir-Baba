export const getWebSiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "MusafirBaba",
  url: "https://musafirbaba.com",
  description: "Most trusted travel agency in India for holiday tour packages and visa assistance.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://musafirbaba.com/holidays?search={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
});
