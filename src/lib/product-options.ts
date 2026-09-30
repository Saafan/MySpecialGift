/**
 * Product extras live in `products.options` and the shopper's pick lives on
 * the design. Money is still integer piastres: a size may add `extraCents`
 * to the base price, and the client never supplies that number.
 */

export interface ProductSizeOption {
  id: string;
  label: string;
  extraCents: number;
}

export interface ProductChoice {
  id: string;
  name: string;
  hex?: string;
}

export interface ProductOptions {
  sizes: ProductSizeOption[];
  choices: ProductChoice[];
  choiceLabel: string;
  includes: string[];
}

export interface ProductSelection {
  sizeId?: string;
  choiceId?: string;
}

const EMPTY_OPTIONS: ProductOptions = {
  sizes: [],
  choices: [],
  choiceLabel: "Option",
  includes: [],
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function parseProductOptions(value: unknown): ProductOptions {
  const raw = asRecord(value);
  if (!raw) return EMPTY_OPTIONS;

  const sizes = Array.isArray(raw.sizes)
    ? raw.sizes.flatMap((item) => {
        const row = asRecord(item);
        if (!row || typeof row.id !== "string" || typeof row.label !== "string") return [];
        const extraCents = typeof row.extraCents === "number" ? Math.round(row.extraCents) : 0;
        return [{ id: row.id, label: row.label, extraCents }];
      })
    : [];

  const choices = Array.isArray(raw.choices)
    ? raw.choices.flatMap((item) => {
        const row = asRecord(item);
        if (!row || typeof row.id !== "string" || typeof row.name !== "string") return [];
        const hex = typeof row.hex === "string" ? row.hex : undefined;
        return [{ id: row.id, name: row.name, ...(hex ? { hex } : {}) }];
      })
    : [];

  return {
    sizes,
    choices,
    choiceLabel: typeof raw.choiceLabel === "string" ? raw.choiceLabel : "Option",
    includes: Array.isArray(raw.includes)
      ? raw.includes.filter((item): item is string => typeof item === "string")
      : [],
  };
}

export function parseProductSelection(value: unknown): ProductSelection {
  const raw = asRecord(value);
  if (!raw) return {};
  return {
    ...(typeof raw.sizeId === "string" ? { sizeId: raw.sizeId } : {}),
    ...(typeof raw.choiceId === "string" ? { choiceId: raw.choiceId } : {}),
  };
}

/** Drop unknown ids and fill the default size and choice. */
export function sanitizeSelection(options: unknown, raw: unknown): ProductSelection {
  const opts = parseProductOptions(options);
  const incoming = parseProductSelection(raw);
  const size =
    opts.sizes.find((entry) => entry.id === incoming.sizeId) ??
    opts.sizes.find((entry) => entry.extraCents === 0) ??
    opts.sizes[0];
  const choice =
    opts.choices.find((entry) => entry.id === incoming.choiceId) ?? opts.choices[0];
  return {
    ...(size ? { sizeId: size.id } : {}),
    ...(choice ? { choiceId: choice.id } : {}),
  };
}

export function resolveUnitPriceCents(
  priceCents: number,
  options: unknown,
  selection: unknown,
): number {
  const opts = parseProductOptions(options);
  const selected = sanitizeSelection(opts, selection);
  const size = opts.sizes.find((entry) => entry.id === selected.sizeId);
  return priceCents + (size?.extraCents ?? 0);
}

export function hasSizeUpcharge(options: unknown): boolean {
  return parseProductOptions(options).sizes.some((size) => size.extraCents > 0);
}

export function formatSelection(options: unknown, selection: unknown): string {
  const opts = parseProductOptions(options);
  const selected = sanitizeSelection(opts, selection);
  const parts: string[] = [];
  const size = opts.sizes.find((entry) => entry.id === selected.sizeId);
  const choice = opts.choices.find((entry) => entry.id === selected.choiceId);
  if (size && opts.sizes.length > 1) parts.push(size.label);
  if (choice) parts.push(choice.name);
  return parts.join(" · ");
}

export function editorHref(
  slug: string,
  selection: ProductSelection,
  templateId?: string | null,
): string {
  const params = new URLSearchParams({ product: slug });
  if (templateId) params.set("template", templateId);
  if (selection.sizeId) params.set("size", selection.sizeId);
  if (selection.choiceId) params.set("choice", selection.choiceId);
  return `/editor/new?${params.toString()}`;
}

/** NFC templates imply who the card is for when the URL has no choice yet. */
export const NFC_TEMPLATE_CHOICE: Record<string, string> = {
  "nfc-best-friend": "best-friend",
  "nfc-girlfriend": "girlfriend",
  "nfc-boyfriend": "boyfriend",
  "nfc-wife": "wife",
  "nfc-mom": "mom",
  "nfc-dad": "dad",
};

export function choiceForTemplate(templateId: string | null | undefined): string | undefined {
  if (!templateId) return undefined;
  return NFC_TEMPLATE_CHOICE[templateId];
}
