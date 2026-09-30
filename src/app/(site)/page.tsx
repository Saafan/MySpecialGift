import Link from "next/link";
import Image from "next/image";
import { ArrowRight, PenLine, Package, Truck } from "lucide-react";
import { db } from "@/server/db";
import { formatCents } from "@/server/pricing";
import { hasSizeUpcharge } from "@/lib/product-options";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function HomePage() {
  const categories = await db.category.findMany({
    where: { products: { some: { status: "ACTIVE" } } },
    orderBy: { position: "asc" },
    include: {
      products: {
        where: { status: "ACTIVE" },
        orderBy: { priceCents: "asc" },
        take: 1,
      },
    },
  });

  const featured = await db.product.findMany({
    where: { status: "ACTIVE" },
    include: { category: true },
    orderBy: { createdAt: "asc" },
    take: 4,
  });

  const collage = [
    { src: "/products/hero-mug-printed.jpg", alt: "", rotate: "-rotate-6", offset: "translate-y-6" },
    { src: "/products/hero-tee-printed.jpg", alt: "", rotate: "rotate-3", offset: "-translate-y-2" },
    { src: "/products/hero-canvas-tableau.jpg", alt: "", rotate: "-rotate-2", offset: "translate-y-10" },
  ];

  return (
    <>
      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-16 sm:px-6 md:grid-cols-[1.1fr_1fr] md:pt-24">
        <div className="animate-rise">
          <p className="mb-4 inline-block rounded-full border border-ember-200 bg-ember-50 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-ember-700">
            Designed by you, printed by us
          </p>
          <h1 className="font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl md:text-6xl lg:text-7xl">
            Make something
            <br />
            they&apos;ll <em className="text-ember-600">keep</em>.
          </h1>
          <p className="prose-measure mt-6 text-lg leading-relaxed text-ink-soft">
            Mugs, wall art, tees, bottles, and the smaller things — a coaster, a
            card, a box of chocolate. Designed in your browser, then printed and
            sent to the door.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/products" className={buttonVariants({ size: "lg" })}>
              Start designing <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/templates"
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Browse templates
            </Link>
          </div>
        </div>

        <div aria-hidden className="hidden items-center justify-center gap-4 md:flex">
          {collage.map((item, index) => (
            <div
              key={item.src}
              className={cn(
                "w-40 rounded-lg border bg-surface p-4 shadow-lift transition-transform duration-300 hover:-translate-y-2 lg:w-48",
                item.rotate,
                item.offset,
                index === 1 && "z-10 shadow-float",
              )}
            >
              <Image src={item.src} alt="" width={300} height={400} className="h-auto w-full object-contain" />
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="border-y bg-cream/40 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
                Choose your canvas
              </h2>
              <p className="mt-2 text-ink-soft">Pick a blank thing. We&apos;ll help with the art.</p>
            </div>
            <Link
              href="/products"
              className="hidden shrink-0 text-sm font-semibold text-ember-600 hover:text-ember-700 sm:block"
            >
              See everything →
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {categories.map((category) => {
              const sample = category.products[0];
              return (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className="group rounded-lg border bg-surface p-5 shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
                >
                  {sample && (
                    <div className="mb-4 rounded-md bg-cream/70 p-4">
                      <Image
                        src={sample.imageUrl}
                        alt=""
                        width={400}
                        height={400}
                        className="h-auto w-full transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <p className="font-display text-lg font-semibold text-ink">{category.name}</p>
                  {sample && (
                    <p className="mt-1 text-sm text-ink-soft">
                      from {formatCents(sample.priceCents)}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <h2 className="font-display text-3xl font-semibold text-ink md:text-4xl">
          Three steps, one very good gift
        </h2>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {[
            {
              icon: Package,
              step: "01",
              title: "Pick a thing",
              copy: "A mug, a canvas, a tee, a bottle — or the chocolate box when words are not quite enough.",
            },
            {
              icon: PenLine,
              step: "02",
              title: "Make it yours",
              copy: "Add photos, text and shapes in the editor, and watch it wrap around the real product in 3D as you go.",
            },
            {
              icon: Truck,
              step: "03",
              title: "We print & ship",
              copy: "Checkout takes a minute. We handle the printing, the packing, and the part where it shows up at your/their door.",
            },
          ].map((item) => (
            <div key={item.step} className="relative border-t-2 border-ember-200 pt-6">
              <span className="font-display text-sm font-semibold tracking-widest text-ember-600">
                {item.step}
              </span>
              <item.icon aria-hidden className="mt-3 h-6 w-6 text-ink" />
              <h3 className="mt-3 font-display text-xl font-semibold text-ink">{item.title}</h3>
              <p className="mt-2 leading-relaxed text-ink-soft">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="mb-8 flex items-end justify-between gap-4">
          <h2 className="font-display text-3xl font-semibold text-ink">Popular right now</h2>
          <Link
            href="/products"
            className="shrink-0 text-sm font-semibold text-ember-600 hover:text-ember-700"
          >
            View all →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {featured.map((product) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className="group rounded-lg border bg-surface shadow-lift transition-all duration-300 hover:-translate-y-1 hover:shadow-float"
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
                <p className="mt-1 text-sm text-ink-soft">
                  {hasSizeUpcharge(product.options) ? "from " : ""}
                  {formatCents(product.priceCents)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="border-t bg-ink py-20 text-paper">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-semibold md:text-5xl">
            The best gifts don&apos;t come from a shelf.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-paper/80">
            They come from twenty minutes of you, a blank mug, and an inside joke.
            Start with a template if the blank page stares back.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/templates" className={buttonVariants({ size: "lg" })}>
              Start with a template
            </Link>
            <Link
              href="/products"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "border-paper/30 text-paper hover:border-paper hover:bg-paper/10",
              )}
            >
              Start from scratch
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
