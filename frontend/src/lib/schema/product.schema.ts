export const getProductSchema = (
  name: string,
  description: string,
  price: string,
  url: string,
  image: string
) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name,
  description,
  image,
  brand: {
    "@type": "Brand",
    name: "MusafirBaba",
  },
  offers: {
    "@type": "Offer",
    priceCurrency: "INR",
    price,
    availability: "https://schema.org/InStock",
    url,
    shippingDetails: {
      "@type": "OfferShippingDetails",
      shippingRate: {
        "@type": "MonetaryAmount",
        value: 0,
        currency: "INR",
      },
      deliveryTime: {
        "@type": "ShippingDeliveryTime",
        handlingTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 0,
          unitCode: "DAY",
        },
        transitTime: {
          "@type": "QuantitativeValue",
          minValue: 0,
          maxValue: 0,
          unitCode: "DAY",
        },
      },
    },
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: "IN",
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 0,
      returnMethod: "https://schema.org/ReturnByMail",
      returnFees: "https://schema.org/FreeReturn",
    },
  },
});

