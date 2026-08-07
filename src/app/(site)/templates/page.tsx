import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Plus } from "lucide-react";
import { db } from "@/server/db";
import { templatesForCategory } from "@/lib/template-meta";
import { isProductCategory } from "@/lib/geometry";

export const metadata: Metadata = {
  title: "Templates",
  description: "Start from a designed head start — everything stays editable.",
};

export default async function TemplatesPage() {
  const categories = await db.category.findMany({
    orderBy: { slug: "asc" },
    include: {
      products: {
        where: { status: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold text-ink md:text-5xl">
          Blank pages are overrated
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Open any of these in the editor and swap in your words, your photos, your
          colours. Every template links to a real product, and everything stays
          editable.
        </p>
      </div>

      {categories.map((category) => {
        const defaultProduct = category.products[0];
        if (!defaultProduct || !isProductCategory(category.slug)) return null;
        const templates = templatesForCategory(category.slug);

        return (
          <section key={category.id} className="mt-14" aria-labelledby={`heading-${category.slug}`}>
            <div className="flex items-baseline justify-between gap-4">
              <h2
                id={`heading-${category.slug}`}
                className="font-display text-2xl font-semibold text-ink"
              >
                {category.name}
              </h2>
              <Link
                href={`/products?category=${category.slug}`}
                className="shrink-0 text-sm font-semibold text-ember-600 hover:text-ember-700"
              >
                Shop {category.name.toLowerCase()} →
              </Link>
            </div>

            <ul className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {/* Start fresh */}
              <li>
                <Link
                  href={`/editor/new?product=${defaultProduct.slug}`}
                  className="group flex h-full min-h-44 flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-line-strong bg-transparent p-6 text-center transition-colors hover:border-ember-400 hover:bg-ember-50/50"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-cream text-ink-soft transition-colors group-hover:bg-ember-100 group-hover:text-ember-700">
                    <Plus aria-hidden className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-semibold text-ink-soft group-hover:text-ink">
                    Start fresh
                  </span>
                </Link>
              </li>

              {templates.map((template) => (
                <li key={template.id}>
                  <Link
                    href={`/editor/new?product=${defaultProduct.slug}&template=${template.id}`}
                    className="group block h-full rounded-lg border bg-surface shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
                  >
                    <div className="rounded-t-lg bg-cream/70 p-4">
                      <Image
                        src={template.thumbnailUrl}
                        alt=""
                        width={300}
                        height={400}
                        className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3.5">
                      <p className="text-sm font-semibold text-ink">{template.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-ink-soft">
                        {template.tagline}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
