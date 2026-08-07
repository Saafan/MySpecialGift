import { describe, expect, it } from "vitest";
import { formatCents, quoteOrder } from "./pricing";

describe("order pricing", () => {
  it("computes 10% tax in integer cents", () => {
    const quote = quoteOrder([{ unitPriceCents: 1299, quantity: 2 }]);
    expect(quote.subtotalCents).toBe(2598);
    expect(quote.taxCents).toBe(260); // rounded, never a float
  });

  it("charges flat shipping at exactly $50.00 (threshold is strictly greater)", () => {
    const quote = quoteOrder([{ unitPriceCents: 5000, quantity: 1 }]);
    expect(quote.shippingCents).toBe(599);
  });

  it("ships free at $50.01", () => {
    const quote = quoteOrder([{ unitPriceCents: 5001, quantity: 1 }]);
    expect(quote.shippingCents).toBe(0);
    expect(quote.totalCents).toBe(5001 + 500);
  });

  it("total = subtotal + tax + shipping", () => {
    const quote = quoteOrder([
      { unitPriceCents: 1299, quantity: 1 },
      { unitPriceCents: 2499, quantity: 2 },
    ]);
    expect(quote.subtotalCents).toBe(6297);
    expect(quote.taxCents).toBe(630);
    expect(quote.shippingCents).toBe(0);
    expect(quote.totalCents).toBe(6927);
  });

  it("formats cents as currency", () => {
    expect(formatCents(1299)).toBe("$12.99");
    expect(formatCents(0)).toBe("$0.00");
  });
});
