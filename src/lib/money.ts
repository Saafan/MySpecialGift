/** Display currency for the storefront, cart, and checkout. */
export const DISPLAY_CURRENCY = "EGP";
export const DISPLAY_LOCALE = "en-EG";

/** Currency display for integer cents (piastres). Safe for both server and client. */
export function formatCents(cents: number, currency = DISPLAY_CURRENCY): string {
  return new Intl.NumberFormat(DISPLAY_LOCALE, { style: "currency", currency }).format(
    cents / 100,
  );
}
