import type { Metadata } from "next";
import Link from "next/link";
import { Package } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { formatCents } from "@/lib/money";
import { buttonVariants } from "@/components/ui/button";
import { OrderStatusBadge } from "./status-badge";

export const metadata: Metadata = { title: "Orders" };

export default async function OrdersPage() {
  const user = await requireUser("/orders");

  const orders = await db.order.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">Orders</h1>

      {orders.length === 0 ? (
        <div className="mx-auto max-w-md py-24 text-center">
          <Package aria-hidden className="mx-auto h-10 w-10 text-ink-faint" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            No orders yet
          </h2>
          <p className="mt-2 text-ink-soft">
            When you order something you made, it shows up here with its full
            history.
          </p>
          <Link href="/designs" className={`${buttonVariants()} mt-6`}>
            Finish a design
          </Link>
        </div>
      ) : (
        <ul className="mt-8 flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-surface p-5 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-float"
              >
                <div>
                  <p className="font-display font-semibold text-ink">
                    Order #{order.number}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-soft">
                    {order.createdAt.toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                    {" · "}
                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={order.status} />
                  <p className="font-display text-lg font-semibold text-ink">
                    {formatCents(order.totalCents)}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
