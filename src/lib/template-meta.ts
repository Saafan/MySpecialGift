import type { ProductCategory } from "@/lib/geometry";

/**
 * Design-template metadata — safe to import anywhere (no Fabric dependency).
 * The matching canvas builders live in `src/lib/editor/template-builders.ts`,
 * keyed by the same ids; a unit test asserts the two sets never drift apart.
 *
 * V1's product pages emitted template ids (t1..t4) that matched nothing in the
 * registry, leaving four dead tiles on every product page. Deep links here use
 * the real ids by construction.
 */
export interface TemplateMeta {
  id: string;
  name: string;
  tagline: string;
  category: ProductCategory;
  thumbnailUrl: string;
}

export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: "birthday-cup",
    name: "Birthday Fun",
    tagline: "Confetti energy for their morning coffee",
    category: "cup",
    thumbnailUrl: "/templates/birthday-cup.svg",
  },
  {
    id: "coffee-cup-1",
    name: "But First, Coffee",
    tagline: "For the person who is a warning label before 9am",
    category: "cup",
    thumbnailUrl: "/templates/coffee-cup-1.svg",
  },
  {
    id: "corporate-cup",
    name: "Corporate Clean",
    tagline: "Logo, lockup, done — the tasteful office mug",
    category: "cup",
    thumbnailUrl: "/templates/corporate-cup.svg",
  },
  {
    id: "photo-mug",
    name: "Photo Mug",
    tagline: "One great photo, wrapped all the way round",
    category: "cup",
    thumbnailUrl: "/templates/photo-mug.svg",
  },
  {
    id: "sports-tee",
    name: "Sports Jersey",
    tagline: "Name on the back, number on the front",
    category: "t-shirt",
    thumbnailUrl: "/templates/sports-tee.svg",
  },
  {
    id: "event-tee",
    name: "Event Day",
    tagline: "Crew shirts that actually get kept",
    category: "t-shirt",
    thumbnailUrl: "/templates/event-tee.svg",
  },
  {
    id: "fashion-tee",
    name: "Minimal Fashion",
    tagline: "Small type, big statement",
    category: "t-shirt",
    thumbnailUrl: "/templates/fashion-tee.svg",
  },
  {
    id: "logo-sticker",
    name: "Logo Badge",
    tagline: "Your mark, die-cut and weatherproof",
    category: "sticker",
    thumbnailUrl: "/templates/logo-sticker.svg",
  },
  {
    id: "product-sticker",
    name: "New Arrival",
    tagline: "Label drops like you mean it",
    category: "sticker",
    thumbnailUrl: "/templates/product-sticker.svg",
  },
  {
    id: "name-badge",
    name: "Hello Name Tag",
    tagline: "The friendliest way to say who you are",
    category: "badge",
    thumbnailUrl: "/templates/name-badge.svg",
  },
  {
    id: "event-badge",
    name: "VIP Access",
    tagline: "Make the guest list feel official",
    category: "badge",
    thumbnailUrl: "/templates/event-badge.svg",
  },
];

export function templatesForCategory(category: ProductCategory): TemplateMeta[] {
  return TEMPLATE_META.filter((t) => t.category === category);
}

export function getTemplateMeta(id: string): TemplateMeta | undefined {
  return TEMPLATE_META.find((t) => t.id === id);
}
