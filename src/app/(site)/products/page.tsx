import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Search, SearchX } from "lucide-react";
import { listCategories, listProducts, type CatalogSort } from "@/server/catalog";
import { formatCents } from "@/server/pricing";
import { cn } from "@/lib/utils";
import { SortSelect } from "./sort-select";

export const metadata: Metadata = {
  title: "Shop",
  description: "Pick a blank canvas — mugs, tees, stickers and badges, all customisable.",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const activeCategory = params.category ?? "";
  const query = params.q?.trim() ?? "";

  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({
      category: activeCategory || undefined,
      q: query || undefined,
      sort: params.sort as CatalogSort | undefined,
    }),
  ]);

  const tabHref = (category: string) => {
    const next = new URLSearchParams();
    if (category) next.set("category", category);
    if (query) next.set("q", query);
    if (params.sort) next.set("sort", params.sort);
    const qs = next.toString();
    return qs ? `/products?${qs}` : "/products";
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="max-w-2xl">
        <h1 className="font-display text-4xl font-semibold text-ink md:text-5xl">
          Pick your blank canvas
        </h1>
        <p className="mt-3 text-lg text-ink-soft">
          Every one of these ships with a live editor and a 3D preview. Choose the
          thing; we&apos;ll help with the art.
        </p>
      </div>

      {/* Search — a plain GET form; the URL is the state */}
      <form action="/products" className="mt-8 flex max-w-md gap-2" role="search">
        {activeCategory && <input type="hidden" name="category" value={activeCategory} />}
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          />
          <label htmlFor="catalog-search" className="sr-only">
            Search products
          </label>
          <input
            id="catalog-search"
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search mugs, tees, stickers…"
            className="h-11 w-full rounded-md border border-line-strong bg-surface pl-10 pr-4 text-sm text-ink placeholder:text-ink-faint focus:border-ember-500"
          />
        </div>
        <button
          type="submit"
          className="h-11 cursor-pointer rounded-md bg-ink px-5 text-sm font-semibold text-paper hover:bg-ink/85"
        >
          Search
        </button>
      </form>

      {/* Category tabs + sort */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <nav aria-label="Categories" className="flex flex-wrap gap-2">
          {[{ slug: "", name: "Everything" }, ...categories].map((category) => {
            const isActive = activeCategory === category.slug;
            return (
              <Link
                key={category.slug || "all"}
                href={tabHref(category.slug)}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-ink text-paper"
                    : "bg-cream text-ink-soft hover:bg-line hover:text-ink",
                )}
              >
                {category.name}
              </Link>
            );
          })}
        </nav>
        <SortSelect />
      </div>

      {/* Grid or empty state */}
      {products.length === 0 ? (
        <div className="mx-auto max-w-md py-24 text-center">
          <SearchX aria-hidden className="mx-auto h-10 w-10 text-ink-faint" />
          <h2 className="mt-4 font-display text-2xl font-semibold text-ink">
            Nothing matches that
          </h2>
          <p className="mt-2 text-ink-soft">
            {query
              ? `We couldn't find anything for "${query}". Try a different word, or browse everything.`
              : "No products in this corner yet."}
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block rounded-md bg-ember-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ember-700"
          >
            Show everything
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((product, index) => (
            <li key={product.id} className="animate-rise" style={{ animationDelay: `${Math.min(index * 40, 240)}ms` }}>
              <Link
                href={`/products/${product.slug}`}
                className="group block rounded-lg border bg-surface shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
              >
                <div className="rounded-t-lg bg-cream/70 p-6">
                  <Image
                    src={product.imageUrl}
                    alt=""
                    width={400}
                    height={400}
                    className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
                <div className="p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                    {product.category.name}
                  </p>
                  <p className="mt-1 font-semibold text-ink">{product.name}</p>
                  <p className="mt-1 text-sm text-ink-soft">{formatCents(product.priceCents)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
