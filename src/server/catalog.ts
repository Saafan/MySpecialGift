import "server-only";
import { db } from "@/server/db";

export type ProductColor = { name: string; hex: string };

export type CatalogSort = "featured" | "price-asc" | "price-desc" | "name";

export interface CatalogFilters {
  category?: string;
  q?: string;
  sort?: CatalogSort;
}

const SORT_ORDERINGS = {
  featured: [{ createdAt: "asc" }],
  "price-asc": [{ priceCents: "asc" }],
  "price-desc": [{ priceCents: "desc" }],
  name: [{ name: "asc" }],
} as const;

export async function listCategories() {
  return db.category.findMany({ orderBy: { slug: "asc" } });
}

export async function listProducts(filters: CatalogFilters = {}) {
  const sort: CatalogSort =
    filters.sort && filters.sort in SORT_ORDERINGS ? filters.sort : "featured";

  return db.product.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.category ? { category: { slug: filters.category } } : {}),
      ...(filters.q
        ? {
            OR: [
              { name: { contains: filters.q, mode: "insensitive" } },
              { description: { contains: filters.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { category: true },
    orderBy: [...SORT_ORDERINGS[sort]],
  });
}

export async function getProductBySlug(slug: string) {
  return db.product.findFirst({
    where: { slug, status: "ACTIVE" },
    include: { category: true },
  });
}

/** First active product of a category — used as the default canvas for template links. */
export async function getDefaultProductForCategory(categorySlug: string) {
  return db.product.findFirst({
    where: { status: "ACTIVE", category: { slug: categorySlug } },
    orderBy: { createdAt: "asc" },
  });
}
