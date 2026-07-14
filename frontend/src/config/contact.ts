export const CONTACT_INFO = {
  WHATSAPP_NUMBER: "919289602447",
  PHONE_NUMBER: "+919289602447",
  PHONE_NUMBER_FORMATTED: "+91 92896 02447",
  PHONE_NUMBER_SECONDARY: "+919355663591",
};

export const getWhatsAppLink = (text?: string) => {
  const baseUrl = `https://wa.me/${CONTACT_INFO.WHATSAPP_NUMBER}`;
  return text ? `${baseUrl}?text=${encodeURIComponent(text)}` : baseUrl;
};
