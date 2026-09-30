import type { ProductCategory } from "@/lib/geometry";

/**
 * Design-template metadata — safe to import anywhere (no Fabric dependency).
 * The matching canvas builders live in `src/lib/editor/template-builders.ts`,
 * keyed by the same ids; a unit test asserts the two sets never drift apart.
 *
 * Gallery layout: product category (mug, tee, …) → occasion folder
 * (Birthdays, Anniversaries, …) → the templates in that folder.
 */

export type TemplateFolderId =
  | "birthdays"
  | "anniversaries"
  | "everyday"
  | "work"
  | "events"
  | "for-someone";

export interface TemplateFolder {
  id: TemplateFolderId;
  name: string;
  tagline: string;
}

export const TEMPLATE_FOLDERS: TemplateFolder[] = [
  { id: "birthdays", name: "Birthdays", tagline: "The day they get older, on purpose" },
  { id: "anniversaries", name: "Anniversaries", tagline: "For the years that quietly added up" },
  { id: "everyday", name: "Everyday", tagline: "Coffee, photos, and the shirt they actually wear" },
  { id: "work", name: "Work & brands", tagline: "A name, a mark, and the office mug" },
  { id: "events", name: "Events", tagline: "Crew shirts, guest pins, game day" },
  { id: "for-someone", name: "For someone", tagline: "A card that already knows who it is for" },
];

export interface TemplateMeta {
  id: string;
  name: string;
  tagline: string;
  category: ProductCategory;
  folder: TemplateFolderId;
  thumbnailUrl: string;
}

export const TEMPLATE_META: TemplateMeta[] = [
  {
    id: "birthday-cup",
    name: "Another Year",
    tagline: "A warm wrap for the day they get older, on purpose",
    category: "cup",
    folder: "birthdays",
    thumbnailUrl: "/templates/birthday-cup.svg",
  },
  {
    id: "anniversary-cup",
    name: "Still Yes",
    tagline: "A quiet wrap for the date that started it",
    category: "cup",
    folder: "anniversaries",
    thumbnailUrl: "/templates/anniversary-cup.svg",
  },
  {
    id: "coffee-cup-1",
    name: "But First",
    tagline: "For the person who is a warning label before 9am",
    category: "cup",
    folder: "everyday",
    thumbnailUrl: "/templates/coffee-cup-1.svg",
  },
  {
    id: "corporate-cup",
    name: "The Office Mug",
    tagline: "A name, a line, and nothing loud",
    category: "cup",
    folder: "work",
    thumbnailUrl: "/templates/corporate-cup.svg",
  },
  {
    id: "photo-mug",
    name: "One Photograph",
    tagline: "A picture they already love, wrapped around",
    category: "cup",
    folder: "everyday",
    thumbnailUrl: "/templates/photo-mug.svg",
  },
  {
    id: "birthday-tee",
    name: "Today.",
    tagline: "The shirt the party actually remembers",
    category: "t-shirt",
    folder: "birthdays",
    thumbnailUrl: "/templates/birthday-tee.svg",
  },
  {
    id: "anniversary-tee",
    name: "A + B",
    tagline: "Names, a year, and the rest is implied",
    category: "t-shirt",
    folder: "anniversaries",
    thumbnailUrl: "/templates/anniversary-tee.svg",
  },
  {
    id: "sports-tee",
    name: "Home Team",
    tagline: "A number, a name, no jersey noise",
    category: "t-shirt",
    folder: "events",
    thumbnailUrl: "/templates/sports-tee.svg",
  },
  {
    id: "event-tee",
    name: "The Day Of",
    tagline: "Crew shirts that actually get kept",
    category: "t-shirt",
    folder: "events",
    thumbnailUrl: "/templates/event-tee.svg",
  },
  {
    id: "fashion-tee",
    name: "Yours.",
    tagline: "One word. That is the whole gift.",
    category: "t-shirt",
    folder: "everyday",
    thumbnailUrl: "/templates/fashion-tee.svg",
  },
  {
    id: "logo-sticker",
    name: "Your Mark",
    tagline: "Small, round, and theirs",
    category: "sticker",
    folder: "work",
    thumbnailUrl: "/templates/logo-sticker.svg",
  },
  {
    id: "product-sticker",
    name: "Just In",
    tagline: "A quiet label, not a shout",
    category: "sticker",
    folder: "work",
    thumbnailUrl: "/templates/product-sticker.svg",
  },
  {
    id: "name-badge",
    name: "Hello",
    tagline: "The friendliest way to say who you are",
    category: "badge",
    folder: "work",
    thumbnailUrl: "/templates/name-badge.svg",
  },
  {
    id: "event-badge",
    name: "Keep This",
    tagline: "A guest pin that does not look rented",
    category: "badge",
    folder: "events",
    thumbnailUrl: "/templates/event-badge.svg",
  },
  {
    id: "nfc-best-friend",
    name: "Best Friend",
    tagline: "The person who already knows the story",
    category: "nfc",
    folder: "for-someone",
    thumbnailUrl: "/templates/nfc-best-friend.svg",
  },
  {
    id: "nfc-girlfriend",
    name: "Girlfriend",
    tagline: "Soft, and a little obvious",
    category: "nfc",
    folder: "for-someone",
    thumbnailUrl: "/templates/nfc-girlfriend.svg",
  },
  {
    id: "nfc-boyfriend",
    name: "Boyfriend",
    tagline: "Warm, and not trying too hard",
    category: "nfc",
    folder: "for-someone",
    thumbnailUrl: "/templates/nfc-boyfriend.svg",
  },
  {
    id: "nfc-wife",
    name: "Wife",
    tagline: "The long version of yes",
    category: "nfc",
    folder: "for-someone",
    thumbnailUrl: "/templates/nfc-wife.svg",
  },
  {
    id: "nfc-mom",
    name: "Mom",
    tagline: "For the one who started it",
    category: "nfc",
    folder: "for-someone",
    thumbnailUrl: "/templates/nfc-mom.svg",
  },
  {
    id: "nfc-dad",
    name: "Dad",
    tagline: "Quiet, and meant to be kept",
    category: "nfc",
    folder: "for-someone",
    thumbnailUrl: "/templates/nfc-dad.svg",
  },
];

export function templatesForCategory(category: ProductCategory): TemplateMeta[] {
  return TEMPLATE_META.filter((t) => t.category === category);
}

export function templatesGroupedForCategory(category: ProductCategory): {
  folder: TemplateFolder;
  templates: TemplateMeta[];
}[] {
  const inCategory = templatesForCategory(category);
  return TEMPLATE_FOLDERS.map((folder) => ({
    folder,
    templates: inCategory.filter((t) => t.folder === folder.id),
  })).filter((group) => group.templates.length > 0);
}

export function getTemplateMeta(id: string): TemplateMeta | undefined {
  return TEMPLATE_META.find((t) => t.id === id);
}

export function getTemplateFolder(id: TemplateFolderId): TemplateFolder {
  return TEMPLATE_FOLDERS.find((folder) => folder.id === id)!;
}
