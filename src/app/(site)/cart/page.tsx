import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Truck } from "lucide-react";
import { requireUser } from "@/server/auth/session";
import { getCartWithItems } from "@/server/cart";
import { quoteOrder, FREE_SHIPPING_THRESHOLD_CENTS } from "@/server/pricing";
import { formatCents } from "@/lib/money";
import { formatSelection, resolveUnitPriceCents } from "@/lib/product-options";
import { buttonVariants } from "@/components/ui/button";
import { CartItemControls } from "./cart-item-controls";
import { WhatsAppHelpNote } from "@/components/layout/whatsapp-help";

export const metadata: Metadata = { title: "Cart" };

export default async function CartPage() {
  const user = await requireUser("/cart");
  const cart = await getCartWithItems(user.id);
  const items = cart?.items ?? [];

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <ShoppingBag aria-hidden className="mx-auto h-10 w-10 text-ink-faint" />
        <h1 className="mt-4 font-display text-3xl font-semibold text-ink">
          Your cart is empty
        </h1>
        <p className="mt-2 text-ink-soft">
          Time to make something. Your designs are waiting — or start a new one.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/designs" className={buttonVariants()}>
            My designs
          </Link>
          <Link href="/products" className={buttonVariants({ variant: "outline" })}>
            Browse products
          </Link>
        </div>
        <WhatsAppHelpNote className="mt-6" />
      </div>
    );
  }

  // Prices come from the products table at render time — the cart stores no
  // prices at all (V1 froze a hardcoded $24.99 into every localStorage item).
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
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const remainingForFreeShipping = FREE_SHIPPING_THRESHOLD_CENTS - quote.subtotalCents;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">
        Cart
        <span className="ml-2 align-middle text-base font-normal text-ink-soft">
          {totalQuantity} {totalQuantity === 1 ? "item" : "items"}
        </span>
      </h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border bg-surface p-4 shadow-lift"
            >
              <Link
                href={`/editor/${item.design.id}`}
                className="block h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-cream/70"
                aria-label={`Edit ${item.design.name}`}
              >
                {item.design.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.design.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <span className="flex h-full items-center justify-center text-[10px] text-ink-faint">
                    No preview
                  </span>
                )}
              </Link>

              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-ink">{item.design.name}</p>
                <p className="text-xs text-ink-soft">
                  {item.product.name} · {item.product.category.name}
                  {formatSelection(item.product.options, item.design.selection)
                    ? ` · ${formatSelection(item.product.options, item.design.selection)}`
                    : ""}
                </p>
                <p className="mt-1 text-sm font-semibold text-ink">
                  {formatCents(
                    resolveUnitPriceCents(
                      item.product.priceCents,
                      item.product.options,
                      item.design.selection,
                    ),
                  )}
                </p>
              </div>

              <CartItemControls itemId={item.id} quantity={item.quantity} name={item.design.name} />
            </li>
          ))}
        </ul>

        <aside className="h-fit rounded-lg border bg-surface p-6 shadow-lift lg:sticky lg:top-24">
          <h2 className="font-display text-lg font-semibold text-ink">Summary</h2>
          <dl className="mt-4 space-y-2.5 text-sm">
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
            <div className="flex justify-between border-t pt-2.5 text-base">
              <dt className="font-semibold text-ink">Total</dt>
              <dd className="font-display text-lg font-semibold text-ink">
                {formatCents(quote.totalCents)}
              </dd>
            </div>
          </dl>

          {remainingForFreeShipping > 0 && (
            <p className="mt-4 flex items-start gap-2 rounded-md bg-pine-100/60 p-3 text-xs leading-relaxed text-pine-700">
              <Truck aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              You&apos;re {formatCents(remainingForFreeShipping)} away from free shipping.
            </p>
          )}

          <Link
            href="/checkout"
            className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}
          >
            Checkout
          </Link>
          <Link
            href="/products"
            className="mt-3 block text-center text-sm font-semibold text-ink-soft hover:text-ink"
          >
            Keep designing
          </Link>
          <WhatsAppHelpNote className="mt-4 text-center" />
        </aside>
      </div>
    </div>
  );
}
