import type { Metadata } from "next";
import Link from "next/link";
import { LogOut, Package, PenLine } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { logout } from "@/server/auth/actions";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppHelpNote } from "@/components/layout/whatsapp-help";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const user = await requireUser("/account");

  const [designCount, orderCount] = await Promise.all([
    db.design.count({ where: { userId: user.id } }),
    db.order.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-semibold text-ink">Account</h1>

      <div className="mt-8 rounded-lg border bg-surface p-6 shadow-lift">
        <p className="font-display text-xl font-semibold text-ink">{user.name}</p>
        <p className="mt-1 text-sm text-ink-soft">{user.email}</p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Link
          href="/designs"
          className="flex items-center gap-4 rounded-lg border bg-surface p-5 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-float"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-ember-100 text-ember-700">
            <PenLine aria-hidden className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold text-ink">
              {designCount} {designCount === 1 ? "design" : "designs"}
            </span>
            <span className="text-xs text-ink-soft">Open the studio</span>
          </span>
        </Link>
        <Link
          href="/orders"
          className="flex items-center gap-4 rounded-lg border bg-surface p-5 shadow-lift transition-all hover:-translate-y-0.5 hover:shadow-float"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-pine-100 text-pine-700">
            <Package aria-hidden className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-semibold text-ink">
              {orderCount} {orderCount === 1 ? "order" : "orders"}
            </span>
            <span className="text-xs text-ink-soft">Track and review</span>
          </span>
        </Link>
      </div>

      <form action={logout} className="mt-8">
        <button
          type="submit"
          className={buttonVariants({ variant: "outline", className: "gap-2" })}
        >
          <LogOut className="h-4 w-4" /> Log out
        </button>
      </form>
      <WhatsAppHelpNote className="mt-8" />
    </div>
  );
}
