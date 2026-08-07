import { PrismaClient } from "@prisma/client";

/**
 * Idempotent seed — everything upserts on a natural key, so re-running is always
 * safe. (V1's seed used `create` for templates and duplicated them on every run.)
 *
 * This is the single product catalogue. V1 kept four diverging hardcoded copies
 * across three pages and the seed; product 2 was simultaneously a "Classic Tee"
 * and a "15oz Black Mug" depending on which page you were reading.
 */
const prisma = new PrismaClient();

const categories = [
  { slug: "cup", name: "Mugs & Cups" },
  { slug: "t-shirt", name: "T-Shirts" },
  { slug: "sticker", name: "Stickers" },
  { slug: "badge", name: "Badges" },
] as const;

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  category: (typeof categories)[number]["slug"];
  colors: { name: string; hex: string }[];
};

const products: SeedProduct[] = [
  {
    slug: "11oz-white-mug",
    name: "11oz White Mug",
    description:
      "The classic. Glossy ceramic with a wide wrap-around print area, dishwasher and microwave safe. Your art goes nearly all the way around — we keep a clean gap at the handle so nothing gets swallowed by the grip.",
    priceCents: 1299,
    imageUrl: "/products/mug-white.svg",
    category: "cup",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Cream", hex: "#F3EBDF" },
    ],
  },
  {
    slug: "15oz-black-mug",
    name: "15oz Black Mug",
    description:
      "Bigger, bolder, and matte black. Light artwork pops beautifully on the dark glaze. Same wrap-around print band, a little more coffee.",
    priceCents: 1499,
    imageUrl: "/products/mug-black.svg",
    category: "cup",
    colors: [
      { name: "Black", hex: "#1F2937" },
      { name: "Navy", hex: "#1E3A5F" },
    ],
  },
  {
    slug: "classic-cotton-tee",
    name: "Classic Cotton Tee",
    description:
      "Midweight 100% combed cotton with a generous chest print area. Pre-shrunk, true to size, and soft enough to become the shirt they always reach for.",
    priceCents: 2499,
    imageUrl: "/products/tshirt-white.svg",
    category: "t-shirt",
    colors: [
      { name: "White", hex: "#FFFFFF" },
      { name: "Black", hex: "#1F2937" },
      { name: "Heather Grey", hex: "#9CA3AF" },
      { name: "Navy", hex: "#1E3A5F" },
    ],
  },
  {
    slug: "premium-tee",
    name: "Premium Tee",
    description:
      "Ring-spun cotton with a tailored fit and a buttery hand feel. The print sits smooth and matte — made for designs that deserve the good fabric.",
    priceCents: 2999,
    imageUrl: "/products/tshirt-premium.svg",
    category: "t-shirt",
    colors: [
      { name: "Bone", hex: "#F5F5F4" },
      { name: "Charcoal", hex: "#374151" },
      { name: "Sage", hex: "#86EFAC" },
    ],
  },
  {
    slug: "circle-sticker-pack",
    name: "Circle Sticker Pack",
    description:
      "A pack of ten matte vinyl circles, weatherproof and dishwasher safe. Laptops, water bottles, guitar cases — anywhere that needs more personality.",
    priceCents: 499,
    imageUrl: "/products/sticker-circle.svg",
    category: "sticker",
    colors: [{ name: "Matte White", hex: "#FFFFFF" }],
  },
  {
    slug: "die-cut-stickers",
    name: "Die-Cut Stickers",
    description:
      "Cut precisely to the outline of your design. Thick vinyl with an easy-peel back and colours that stay loud in the sun and the rain.",
    priceCents: 699,
    imageUrl: "/products/sticker-diecut.svg",
    category: "sticker",
    colors: [{ name: "Gloss White", hex: "#FFFFFF" }],
  },
  {
    slug: "round-pin-badge",
    name: "Round Pin Badge",
    description:
      "A 38mm classic pin-back badge with a mirror-gloss face. Small canvas, big statement — great in threes.",
    priceCents: 699,
    imageUrl: "/products/badge-pin.svg",
    category: "badge",
    colors: [
      { name: "Silver Back", hex: "#D1D5DB" },
      { name: "Gold Back", hex: "#FBBF24" },
    ],
  },
  {
    slug: "square-badge",
    name: "Square Badge",
    description:
      "A rounded square badge with a satin finish and a sturdy clasp. The unexpected shape people ask about.",
    priceCents: 799,
    imageUrl: "/products/badge-square.svg",
    category: "badge",
    colors: [
      { name: "Silver Back", hex: "#D1D5DB" },
      { name: "White", hex: "#FFFFFF" },
    ],
  },
];

async function main() {
  const categoryIds: Record<string, string> = {};

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: { slug: category.slug, name: category.name },
    });
    categoryIds[category.slug] = row.id;
  }

  for (const product of products) {
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        colors: product.colors,
        categoryId: categoryIds[product.category],
        status: "ACTIVE",
      },
      create: {
        slug: product.slug,
        name: product.name,
        description: product.description,
        priceCents: product.priceCents,
        imageUrl: product.imageUrl,
        colors: product.colors,
        categoryId: categoryIds[product.category],
        status: "ACTIVE",
      },
    });
  }

  console.log(`Seeded ${categories.length} categories, ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
