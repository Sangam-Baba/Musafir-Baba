export const getProductSchema = ({
  name,
  description,
  price,
  url,
}: {
  name: string;
  description: string;
  price: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name,
  description,
  brand: {
    "@type": "Organization",
    name: "MusafirBaba",
  },
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    price,
    availability: "https://schema.org/InStock",
    url,
  },
});
