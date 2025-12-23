export const getOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "MusafirBaba",
  url: "https://musafirbaba.com",
  logo: "https://musafirbaba.com/logo.svg",
  sameAs: [
    "https://www.facebook.com/hellomusafirbaba",
    "https://x.com/itsmusafirbaba",
    "https://www.instagram.com/hello_musafirbaba",
    "http://www.youtube.com/@hello_musafirbaba",
    "https://www.linkedin.com/company/musafirbaba",
    "https://pin.it/1rMQjjMRE",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+91-92896 02447",
    contactType: "Customer Service",
    areaServed: "IN",
    availableLanguage: ["English", "Hindi"],
  },
});
