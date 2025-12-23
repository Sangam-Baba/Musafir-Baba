export const getLocalSchema = () => {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "MusafirBaba",
    image: "https://musafirbaba.com/logo.svg",
    "@id": "https://musafirbaba.com/",
    url: "https://musafirbaba.com/",
    telephone: "+91-92896 02447",
    priceRange: "₹5,000–₹20,000",
    address: {
      "@type": "PostalAddress",
      streetAddress:
        "Plot no. 2 & 3, 1st Floor, Khaira Mor, Near Dhansa Bus Stand Metro Station, Gate no. 1, Najafgarh",
      addressLocality: "New Delhi",
      postalCode: "110043",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: "28.6116406",
      longitude: "76.9756233",
    },
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ],
        opens: "09:00",
        closes: "19:00",
      },
    ],
    sameAs: [
      "https://www.facebook.com/hellomusafirbaba",
      "https://x.com/itsmusafirbaba",
      "https://www.instagram.com/hello_musafirbaba",
      "http://www.youtube.com/@hello_musafirbaba",
      "https://www.linkedin.com/company/musafirbaba",
      "https://pin.it/1rMQjjMRE",
    ],
  };
};
