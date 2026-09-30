import type { Metadata } from "next";
import Link from "next/link";
import { PenLine } from "lucide-react";
import { db } from "@/server/db";
import { requireUser } from "@/server/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { DesignCard } from "./design-card";

export const metadata: Metadata = { title: "My designs" };

export default async function DesignsPage() {
  const user = await requireUser("/designs");

  const designs = await db.design.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    include: { product: { include: { category: true } } },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold text-ink">My designs</h1>
          <p className="mt-2 text-ink-soft">
            Everything you&apos;ve made, saved to your account — pick up any of them
            where you left off.
          </p>
        </div>
        <Link href="/products" className={buttonVariants()}>
          <PenLine className="h-4 w-4" /> New design
        </Link>
      </div>

      {designs.length === 0 ? (
        <div className="mx-auto max-w-md py-24 text-center">
          <PenLine aria-hidden className="mx-auto h-10 w-10 text-ink-faint" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            Nothing here yet — and that&apos;s exciting
          </h2>
          <p className="mt-2 text-ink-soft">
            Your first design is twenty minutes and one good idea away. Start
            from a template if the blank canvas stares back.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/templates" className={buttonVariants()}>
              Browse templates
            </Link>
            <Link href="/products" className={buttonVariants({ variant: "outline" })}>
              Pick a product
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {designs.map((design) => (
            <li key={design.id}>
              <DesignCard
                design={{
                  id: design.id,
                  name: design.name,
                  status: design.status,
                  thumbnailUrl: design.thumbnailUrl,
                  productName: design.product.name,
                  categoryName: design.product.category.name,
                  updatedAt: design.updatedAt.toISOString(),
                }}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
