import type { ArtboardSize, ProductCategory } from "@/lib/geometry";

/**
 * The persisted design format — versioned from day one.
 *
 * V1 persisted raw Fabric JSON in four different places with no schema version
 * and three independent localStorage key parsers (one of which was already
 * broken: "Edit Design" always opened a blank canvas). V2 has exactly one
 * envelope, one guest-draft module, and a version field so future migrations
 * are a switch statement instead of archaeology.
 */

export const DESIGN_SCHEMA_VERSION = 1;

export interface DesignPayload {
  schemaVersion: number;
  category: ProductCategory;
  printSize: ArtboardSize;
  /** Fabric canvas JSON (canvas.toJSON()). */
  canvas: unknown;
}

export function buildDesignPayload(
  category: ProductCategory,
  printSize: ArtboardSize,
  canvasJson: unknown,
): DesignPayload {
  return { schemaVersion: DESIGN_SCHEMA_VERSION, category, printSize, canvas: canvasJson };
}

export function parseDesignPayload(raw: unknown): DesignPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Partial<DesignPayload>;
  if (
    typeof value.schemaVersion !== "number" ||
    !value.category ||
    !value.printSize ||
    value.canvas === undefined
  ) {
    return null;
  }
  // Future format changes: migrate older schemaVersions here.
  return value as DesignPayload;
}

/* ------------------------------------------------------------------ */
/* Guest drafts — small JSON only (uploads require an account, so no   */
/* base64 payloads can enter a draft; V1's quota-bomb path is closed). */
/* ------------------------------------------------------------------ */

const DRAFT_PREFIX = "mlg:draft:v1:";

export interface GuestDraft {
  payload: DesignPayload;
  savedAt: number;
}

export function saveGuestDraft(productSlug: string, payload: DesignPayload): boolean {
  try {
    localStorage.setItem(
      `${DRAFT_PREFIX}${productSlug}`,
      JSON.stringify({ payload, savedAt: Date.now() } satisfies GuestDraft),
    );
    return true;
  } catch {
    // Quota exceeded or storage unavailable — the caller surfaces this to the
    // user. V1 let QuotaExceededError propagate silently and lost the design.
    return false;
  }
}

export function loadGuestDraft(productSlug: string): GuestDraft | null {
  try {
    const raw = localStorage.getItem(`${DRAFT_PREFIX}${productSlug}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as GuestDraft;
    if (!parseDesignPayload(parsed?.payload)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearGuestDraft(productSlug: string) {
  try {
    localStorage.removeItem(`${DRAFT_PREFIX}${productSlug}`);
  } catch {
    // Nothing useful to do.
  }
}
