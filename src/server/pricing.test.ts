import { describe, expect, it } from "vitest";
import {
  FLAT_SHIPPING_CENTS,
  FREE_SHIPPING_THRESHOLD_CENTS,
  formatCents,
  quoteOrder,
} from "./pricing";

describe("order pricing", () => {
  it("computes 10% tax in integer cents", () => {
    const quote = quoteOrder([{ unitPriceCents: 24900, quantity: 2 }]);
    expect(quote.subtotalCents).toBe(49800);
    expect(quote.taxCents).toBe(4980);
  });

  it("charges flat shipping at exactly the free-shipping threshold", () => {
    const quote = quoteOrder([{ unitPriceCents: FREE_SHIPPING_THRESHOLD_CENTS, quantity: 1 }]);
    expect(quote.shippingCents).toBe(FLAT_SHIPPING_CENTS);
  });

  it("ships free one piastre over the threshold", () => {
    const quote = quoteOrder([
      { unitPriceCents: FREE_SHIPPING_THRESHOLD_CENTS + 1, quantity: 1 },
    ]);
    expect(quote.shippingCents).toBe(0);
    expect(quote.totalCents).toBe(FREE_SHIPPING_THRESHOLD_CENTS + 1 + 7500);
  });

  it("total = subtotal + tax + shipping", () => {
    const quote = quoteOrder([
      { unitPriceCents: 24900, quantity: 1 },
      { unitPriceCents: 44900, quantity: 2 },
    ]);
    expect(quote.subtotalCents).toBe(114700);
    expect(quote.taxCents).toBe(11470);
    expect(quote.shippingCents).toBe(0);
    expect(quote.totalCents).toBe(126170);
  });

  it("formats cents as Egyptian pounds", () => {
    expect(formatCents(24900)).toBe("EGP\u00a0249.00");
    expect(formatCents(0)).toBe("EGP\u00a00.00");
  });
});
