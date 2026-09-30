import { Prisma, PrismaClient } from "@prisma/client";

/**
 * Idempotent seed — everything upserts on a natural key, so re-running is always
 * safe. Products that drop out of this list are archived rather than deleted,
 * so old designs and orders keep their references.
 */
const prisma = new PrismaClient();

const categories = [
  { slug: "cup", name: "Mugs & Cups", position: 0 },
  { slug: "canvas", name: "Wall Art", position: 1 },
  { slug: "coaster", name: "Coasters", position: 2 },
  { slug: "chocolate", name: "Chocolate", position: 3 },
  { slug: "phone", name: "Phone Cases", position: 4 },
  { slug: "bag", name: "Bags", position: 5 },
  { slug: "bottle", name: "Bottles", position: 6 },
  { slug: "t-shirt", name: "T-Shirts", position: 7 },
  { slug: "puzzle", name: "Puzzles", position: 8 },
  { slug: "pillow", name: "Pillows", position: 9 },
  { slug: "nfc", name: "NFC Cards", position: 10 },
] as const;

type ShopCategory = (typeof categories)[number]["slug"];

type SeedProduct = {
  slug: string;
  name: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  category: ShopCategory;
  colors: { name: string; hex: string }[];
  options?: Prisma.InputJsonValue;
};

const products: SeedProduct[] = [
  {
    slug: "mug",
    name: "Mug",
    description:
      "A classic ceramic mug. Your art wraps the wall from rim to base, with a clean gap only at the handle.",
    priceCents: 19900,
    imageUrl: "/products/mug-white.jpg",
    category: "cup",
    colors: [{ name: "White", hex: "#FFFFFF" }],
  },
  {
    slug: "mug-with-spoon",
    name: "Mug With Spoon",
    description:
      "The wrap-around mug, with a spoon that stays with it. For cocoa, dessert, and anyone who is always looking for a spoon.",
    priceCents: 24900,
    imageUrl: "/products/mug-with-spoon.svg",
    category: "cup",
    colors: [{ name: "White", hex: "#FFFFFF" }],
  },
  {
    slug: "canvas-wall-art",
    name: "Canvas Wall Art Tableau",
    description:
      "A stretched canvas tableau. The 30 × 40 cm size is 299 EGP. Step up to 40 × 50 cm or 50 × 60 cm when the wall deserves a bigger picture.",
    priceCents: 29900,
    imageUrl: "/products/canvas-tableau.jpg",
    category: "canvas",
    colors: [],
    options: {
      sizes: [
        { id: "30x40", label: "30 cm × 40 cm", extraCents: 0 },
        { id: "40x50", label: "40 cm × 50 cm", extraCents: 5000 },
        { id: "50x60", label: "50 cm × 60 cm", extraCents: 10000 },
      ],
    },
  },
  {
    slug: "round-glass-mug",
    name: "Round Glass Mug with Bamboo Lid & Glass Straw",
    description:
      "A round glass mug with no handle, a bamboo lid, and a glass straw. The print sits on the glass so the drink still shows through around it.",
    priceCents: 24900,
    imageUrl: "/products/glass-mug.svg",
    category: "cup",
    colors: [{ name: "Clear glass", hex: "#E7F2F6" }],
  },
  {
    slug: "acrylic-coaster",
    name: "Acrylic Coaster",
    description:
      "A square acrylic coaster with a glossy face. One photograph or one joke, and the table stays free of rings.",
    priceCents: 12900,
    imageUrl: "/products/coaster.jpg",
    category: "coaster",
    colors: [],
  },
  {
    slug: "chocolate-box",
    name: "Chocolate Box",
    description:
      "A gift box you can put a note on. Inside: Ferrero Rocher (3 pieces), Galaxy, Cadbury, Kinder Bars, Kinder Bueno, and Milka.",
    priceCents: 99900,
    imageUrl: "/products/chocolate-box.jpg",
    category: "chocolate",
    colors: [],
    options: {
      includes: [
        "Ferrero Rocher (3 pieces)",
        "Galaxy",
        "Cadbury",
        "Kinder Bars",
        "Kinder Bueno",
        "Milka",
      ],
    },
  },
  {
    slug: "iphone-cover",
    name: "iPhone Cover",
    description: "A slim iPhone cover. Your design prints edge to edge on the back.",
    priceCents: 22900,
    imageUrl: "/products/iphone-cover.jpg",
    category: "phone",
    colors: [],
  },
  {
    slug: "tote-bag",
    name: "Tote Bag",
    description:
      "A cotton tote with a generous front print. Market runs, books, and the bag they actually carry.",
    priceCents: 19900,
    imageUrl: "/products/tote-bag.jpg",
    category: "bag",
    colors: [{ name: "Natural", hex: "#F3EBDF" }],
  },
  {
    slug: "thermal-bottle",
    name: "Thermal Bottle",
    description:
      "A thermal bottle that holds the temperature they left it at. Choose black, red, white, green, blue, or orange.",
    priceCents: 29900,
    imageUrl: "/products/thermal-bottle.jpg",
    category: "bottle",
    colors: [
      { name: "Black", hex: "#1F2937" },
      { name: "Red", hex: "#DC2626" },
      { name: "White", hex: "#FFFFFF" },
      { name: "Green", hex: "#16A34A" },
      { name: "Blue", hex: "#2563EB" },
      { name: "Orange", hex: "#EA580C" },
    ],
    options: {
      choiceLabel: "Colour",
      choices: [
        { id: "black", name: "Black", hex: "#1F2937" },
        { id: "red", name: "Red", hex: "#DC2626" },
        { id: "white", name: "White", hex: "#FFFFFF" },
        { id: "green", name: "Green", hex: "#16A34A" },
        { id: "blue", name: "Blue", hex: "#2563EB" },
        { id: "orange", name: "Orange", hex: "#EA580C" },
      ],
    },
  },
  {
    slug: "t-shirt",
    name: "T-Shirt",
    description:
      "A midweight tee with room for a chest print. Soft enough to become the shirt they always reach for.",
    priceCents: 39900,
    imageUrl: "/products/tshirt-white.jpg",
    category: "t-shirt",
    colors: [{ name: "White", hex: "#FFFFFF" }],
  },
  {
    slug: "puzzle",
    name: "Puzzle",
    description:
      "A custom puzzle of a photo or a design you make here. Something to sit down and finish together.",
    priceCents: 19900,
    imageUrl: "/products/puzzle.jpg",
    category: "puzzle",
    colors: [],
  },
  {
    slug: "pillow",
    name: "Pillow",
    description:
      "A soft pillow with your print across the face. For the sofa, the bed, and the person who steals both.",
    priceCents: 24900,
    imageUrl: "/products/pillow.jpg",
    category: "pillow",
    colors: [{ name: "Ivory", hex: "#F7F1E8" }],
  },
  {
    slug: "nfc-card",
    name: "NFC Card",
    description:
      "A small card with a cozy design, made for a best friend, girlfriend, boyfriend, wife, mom, or dad. Pick who it is for, then make the front yours.",
    priceCents: 14900,
    imageUrl: "/products/nfc-card.jpg",
    category: "nfc",
    colors: [],
    options: {
      choiceLabel: "For",
      choices: [
        { id: "best-friend", name: "Best Friend", hex: "#C4A484" },
        { id: "girlfriend", name: "Girlfriend", hex: "#E8A0BF" },
        { id: "boyfriend", name: "Boyfriend", hex: "#7C9CBF" },
        { id: "wife", name: "Wife", hex: "#C46B6B" },
        { id: "mom", name: "Mom", hex: "#D4A574" },
        { id: "dad", name: "Dad", hex: "#6B8F71" },
      ],
    },
  },
];

async function main() {
  const categoryIds: Record<string, string> = {};

  for (const category of categories) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name, position: category.position },
      create: { slug: category.slug, name: category.name, position: category.position },
    });
    categoryIds[category.slug] = row.id;
  }

  for (const product of products) {
    const data = {
      name: product.name,
      description: product.description,
      priceCents: product.priceCents,
      currency: "EGP",
      imageUrl: product.imageUrl,
      colors: product.colors,
      options: product.options ?? {},
      categoryId: categoryIds[product.category],
      status: "ACTIVE" as const,
    };
    await prisma.product.upsert({
      where: { slug: product.slug },
      update: data,
      create: { slug: product.slug, ...data },
    });
  }

  await prisma.product.updateMany({
    where: { slug: { notIn: products.map((product) => product.slug) } },
    data: { status: "ARCHIVED" },
  });

  console.log(`Seeded ${categories.length} categories, ${products.length} products.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
