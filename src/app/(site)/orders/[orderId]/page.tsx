import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PartyPopper } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { formatCents } from "@/lib/money";
import { OrderStatusBadge } from "../status-badge";

export const metadata: Metadata = { title: "Order details" };

interface ShippingAddress {
  fullName?: string;
  address1?: string;
  address2?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const { orderId } = await params;
  const { placed } = await searchParams;
  // Deep-link returnTo so a mid-session expiry lands back on this order.
  const user = await requireUser(`/orders/${orderId}`);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order || order.userId !== user.id) notFound();

  const address = (order.shippingAddress ?? {}) as ShippingAddress;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      {placed === "1" && (
        <div
          role="status"
          className="mb-8 flex items-start gap-3 rounded-lg border border-pine-200 bg-pine-100/60 p-5 animate-rise"
        >
          <PartyPopper aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-pine-600" />
          <div>
            <p className="font-display text-lg font-semibold text-pine-700">
              Order placed — nicely done.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-pine-700/90">
              We&apos;ve got everything we need. Your designs head to print next,
              and this page tracks the whole journey.
            </p>
          </div>
        </div>
      )}

      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold text-ink">
          Order #{order.number}
        </h1>
        <OrderStatusBadge status={order.status} />
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Placed{" "}
        {order.createdAt.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>

      <div className="mt-8 rounded-lg border bg-surface shadow-lift">
        <ul className="divide-y">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-4 p-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-cream/70">
                {item.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    className="h-full w-full object-contain p-1"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-ink">{item.productName}</p>
                {item.optionsLabel ? (
                  <p className="text-xs text-ink-soft">{item.optionsLabel}</p>
                ) : null}
                <p className="text-xs text-ink-soft">
                  Qty {item.quantity} · {formatCents(item.unitPriceCents)} each
                </p>
              </div>
              <p className="font-semibold text-ink">
                {formatCents(item.unitPriceCents * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        <dl className="space-y-2 border-t bg-cream/40 p-4 text-sm">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Subtotal</dt>
            <dd className="font-semibold text-ink">{formatCents(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Tax</dt>
            <dd className="font-semibold text-ink">{formatCents(order.taxCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-soft">Shipping</dt>
            <dd className="font-semibold text-ink">
              {order.shippingCents === 0 ? "Free" : formatCents(order.shippingCents)}
            </dd>
          </div>
          <div className="flex justify-between border-t pt-2 text-base">
            <dt className="font-semibold text-ink">Total</dt>
            <dd className="font-display font-semibold text-ink">
              {formatCents(order.totalCents)}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 rounded-lg border bg-surface p-5 shadow-lift">
        <h2 className="font-display text-base font-semibold text-ink">Shipping to</h2>
        <address className="mt-2 text-sm not-italic leading-relaxed text-ink-soft">
          {address.fullName}
          <br />
          {address.address1}
          {address.address2 ? (
            <>
              <br />
              {address.address2}
            </>
          ) : null}
          <br />
          {address.city}, {address.state} {address.zip}
          <br />
          {address.country}
        </address>
      </div>

      {order.paymentRef?.startsWith("test_") && (
        <p className="mt-4 text-xs text-ink-faint">
          Paid in test mode — no real charge was made. Reference: {order.paymentRef}
        </p>
      )}
    </div>
  );
}
