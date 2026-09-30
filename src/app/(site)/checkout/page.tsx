import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/session";
import { getCartWithItems } from "@/server/cart";
import { quoteOrder } from "@/server/pricing";
import { formatCents } from "@/lib/money";
import { formatSelection, resolveUnitPriceCents } from "@/lib/product-options";
import { CheckoutForm } from "./checkout-form";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  const cart = await getCartWithItems(user.id);
  const items = cart?.items ?? [];

  if (items.length === 0) redirect("/cart");

  const quote = quoteOrder(
    items.map((item) => ({
      unitPriceCents: resolveUnitPriceCents(
        item.product.priceCents,
        item.product.options,
        item.design.selection,
      ),
      quantity: item.quantity,
    })),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">Checkout</h1>
      <p className="mt-2 text-ink-soft">
        One form, no account hoops — you&apos;re two minutes from done.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <CheckoutForm totalLabel={formatCents(quote.totalCents)} />

        <aside className="order-first h-fit rounded-lg border bg-surface p-6 shadow-lift lg:order-none lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-ink">Your order</h2>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-sm border bg-cream/70">
                  {item.design.thumbnailUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.design.thumbnailUrl}
                      alt=""
                      className="h-full w-full object-contain p-0.5"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">
                    {item.design.name}
                  </p>
                  <p className="text-xs text-ink-soft">
                    {item.product.name}
                    {formatSelection(item.product.options, item.design.selection)
                      ? ` · ${formatSelection(item.product.options, item.design.selection)}`
                      : ""}{" "}
                    × {item.quantity}
                  </p>
                </div>
                <p className="text-sm font-semibold text-ink">
                  {formatCents(
                    resolveUnitPriceCents(
                      item.product.priceCents,
                      item.product.options,
                      item.design.selection,
                    ) * item.quantity,
                  )}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-5 space-y-2 border-t pt-4 text-sm">
            <div className="flex justify-between">
              <dt className="text-ink-soft">Subtotal</dt>
              <dd className="font-semibold text-ink">{formatCents(quote.subtotalCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Tax (10%)</dt>
              <dd className="font-semibold text-ink">{formatCents(quote.taxCents)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-soft">Shipping</dt>
              <dd className="font-semibold text-ink">
                {quote.shippingCents === 0 ? (
                  <span className="text-pine-600">Free</span>
                ) : (
                  formatCents(quote.shippingCents)
                )}
              </dd>
            </div>
            <div className="flex justify-between border-t pt-2 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-display text-lg font-semibold text-ink">
                {formatCents(quote.totalCents)}
              </dd>
            </div>
          </dl>

          <Link
            href="/cart"
            className="mt-4 block text-center text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Back to cart
          </Link>
        </aside>
      </div>
    </div>
  );
}
