/** Human-readable brand used in titles, copyright, and payment copy. */
export const BRAND_NAME = "My Special Gift";

/** Compact wordmark used in the header, footer, and auth chrome. */
export const BRAND_MARK = "MySpecialGift";

/** WhatsApp inquiry line — Egyptian mobile, digits only for wa.me. */
export const WHATSAPP_E164 = "201014509463";
export const WHATSAPP_DISPLAY = "+20 10 1450 9463";
export const WHATSAPP_HREF = `https://wa.me/${WHATSAPP_E164}?text=${encodeURIComponent(
  `Hi ${BRAND_NAME} — I need a hand with something.`,
)}`;
