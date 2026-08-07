/**
 * Order pricing — the only place tax and shipping rules exist.
 * V1 duplicated these rules in three layers (cart JSX, checkout JSX, API service);
 * they agreed only by luck. V2 computes money exclusively on the server, in
 * integer cents, and the client renders what the server returns.
 *
 * Rules preserved from V1's business contract:
 * - Tax: 10% of subtotal.
 * - Shipping: free when the subtotal is strictly greater than $50, else $5.99 flat.
 * - New in V2: an order must contain at least one item (V1 happily charged
 *   $5.99 shipping on an empty order).
 */

export const TAX_RATE = 0.1;
export const FREE_SHIPPING_THRESHOLD_CENTS = 5000;
export const FLAT_SHIPPING_CENTS = 599;

export interface QuoteLine {
  unitPriceCents: number;
  quantity: number;
}

export interface OrderQuote {
  subtotalCents: number;
  taxCents: number;
  shippingCents: number;
  totalCents: number;
}

export function quoteOrder(lines: QuoteLine[]): OrderQuote {
  const subtotalCents = lines.reduce(
    (sum, line) => sum + line.unitPriceCents * line.quantity,
    0,
  );
  const taxCents = Math.round(subtotalCents * TAX_RATE);
  const shippingCents =
    subtotalCents > FREE_SHIPPING_THRESHOLD_CENTS ? 0 : FLAT_SHIPPING_CENTS;
  return {
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents: subtotalCents + taxCents + shippingCents,
  };
}

export function formatCents(cents: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(
    cents / 100,
  );
}
