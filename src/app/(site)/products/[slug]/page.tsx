import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductBySlug } from "@/server/catalog";
import { FREE_SHIPPING_THRESHOLD_CENTS, formatCents } from "@/server/pricing";
import { isProductCategory } from "@/lib/geometry";
import {
  choiceForTemplate,
  editorHref,
  parseProductOptions,
  sanitizeSelection,
} from "@/lib/product-options";
import { templatesGroupedForCategory } from "@/lib/template-meta";
import { WhatsAppHelpNote } from "@/components/layout/whatsapp-help";
import { ProductConfigurator } from "./product-configurator";

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

  const options = parseProductOptions(product.options);
  const categorySlug = product.category.slug;
  const groups = isProductCategory(categorySlug)
    ? templatesGroupedForCategory(categorySlug)
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
        <div className="rounded-lg border bg-cream/70 p-6 shadow-lift sm:p-10">
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
          <ProductConfigurator
            slug={product.slug}
            priceCents={product.priceCents}
            options={options}
            showTemplatesLink={groups.length > 0}
          />
          <p className="prose-measure mt-5 leading-relaxed text-ink-soft">
            {product.description}
          </p>

          {options.includes.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-ink">Inside the box</p>
              <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
                {options.includes.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-6 text-sm text-ink-soft">
            Free shipping on orders over {formatCents(FREE_SHIPPING_THRESHOLD_CENTS)} · Printed
            and dispatched in 2–3 days
          </p>
          <WhatsAppHelpNote className="mt-3" />
        </div>
      </div>

      {groups.length > 0 && (
        <section id="templates" className="mt-20 scroll-mt-24">
          <h2 className="font-display text-2xl font-semibold text-ink md:text-3xl">
            Head starts for {product.category.name}
          </h2>
          <p className="mt-2 text-ink-soft">
            Folders for birthdays, anniversaries, and the rest — open one and make it
            yours. Everything stays editable.
          </p>
          {groups.map(({ folder, templates }) => (
            <section key={folder.id} className="mt-8" aria-labelledby={`folder-${folder.id}`}>
              <h3
                id={`folder-${folder.id}`}
                className="font-display text-lg font-semibold text-ink"
              >
                {folder.name}
              </h3>
              <p className="text-sm text-ink-soft">{folder.tagline}</p>
              <ul className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
                {templates.map((template) => (
                  <li key={template.id}>
                    <Link
                      href={editorHref(
                        product.slug,
                        sanitizeSelection(product.options, {
                          choiceId: choiceForTemplate(template.id),
                        }),
                        template.id,
                      )}
                      className="group block rounded-lg border bg-surface shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
                    >
                      <div className="overflow-hidden rounded-t-lg border-b border-line bg-paper">
                        <Image
                          src={template.thumbnailUrl}
                          alt=""
                          width={300}
                          height={400}
                          unoptimized
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
          ))}
        </section>
      )}
    </div>
  );
}
