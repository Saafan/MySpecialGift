import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Palette, Sparkles } from "lucide-react";
import { getProductBySlug, type ProductColor } from "@/server/catalog";
import { formatCents } from "@/server/pricing";
import { isProductCategory } from "@/lib/geometry";
import { templatesForCategory } from "@/lib/template-meta";
import { buttonVariants } from "@/components/ui/button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  return { title: product ? product.name : "Not found" };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);

  // V1 silently rendered product #1 for any unknown id. Unknown products 404.
  if (!product) notFound();

  const colors = (product.colors as ProductColor[]) ?? [];
  const categorySlug = product.category.slug;
  const templates = isProductCategory(categorySlug)
    ? templatesForCategory(categorySlug)
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link
        href="/products"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> All products
      </Link>

      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="rounded-lg border bg-cream/70 p-10 shadow-lift">
          <Image
            src={product.imageUrl}
            alt={product.name}
            width={400}
            height={400}
            priority
            className="h-auto w-full"
          />
        </div>

        <div className="animate-rise">
          <p className="text-xs font-bold uppercase tracking-wider text-ember-600">
            {product.category.name}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold text-ink md:text-5xl">
            {product.name}
          </h1>
          <p className="mt-3 font-display text-2xl text-ink">
            {formatCents(product.priceCents)}
          </p>
          <p className="prose-measure mt-5 leading-relaxed text-ink-soft">
            {product.description}
          </p>

          {colors.length > 0 && (
            <div className="mt-6">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                <Palette aria-hidden className="h-4 w-4" /> Available in
              </p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {colors.map((color) => (
                  <li
                    key={color.name}
                    className="flex items-center gap-2 rounded-full border bg-surface py-1 pl-1.5 pr-3 text-xs font-medium text-ink-soft"
                  >
                    <span
                      aria-hidden
                      className="h-4 w-4 rounded-full border border-ink/10"
                      style={{ backgroundColor: color.hex }}
                    />
                    {color.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/editor/new?product=${product.slug}`}
              className={buttonVariants({ size: "lg" })}
            >
              Design yours <ArrowRight className="h-4 w-4" />
            </Link>
            {templates.length > 0 && (
              <a
                href="#templates"
                className={buttonVariants({ variant: "outline", size: "lg" })}
              >
                <Sparkles className="h-4 w-4" /> Start from a template
              </a>
            )}
          </div>

          <p className="mt-6 text-sm text-ink-soft">
            Free shipping on orders over $50 · Printed and dispatched in 2–3 days
          </p>
        </div>
      </div>

      {templates.length > 0 && (
        <section id="templates" className="mt-20 scroll-mt-24">
          <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
            Head starts for this {product.category.name.replace(/s$/, "").toLowerCase()}
          </h2>
          <p className="mt-2 text-ink-soft">
            Open one in the editor and make it yours — everything stays editable.
          </p>
          <ul className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {templates.map((template) => (
              <li key={template.id}>
                <Link
                  href={`/editor/new?product=${product.slug}&template=${template.id}`}
                  className="group block rounded-lg border bg-surface shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
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
      )}
    </div>
  );
}
