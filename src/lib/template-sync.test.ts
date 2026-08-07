import { describe, expect, it } from "vitest";
import { TEMPLATE_META } from "./template-meta";
import { hasTemplateBuilder, listBuilderIds } from "./editor/template-builders";

/**
 * Single-source enforcement: every template shown in the gallery must have a
 * canvas builder, and every builder (except "blank") must be discoverable in
 * the gallery. V1's product pages linked to template ids (t1..t4) that matched
 * nothing in the registry — this test makes that class of drift impossible.
 */
describe("template registry sync", () => {
  it("every gallery template has a canvas builder", () => {
    for (const meta of TEMPLATE_META) {
      expect(hasTemplateBuilder(meta.id), `missing builder for "${meta.id}"`).toBe(true);
    }
  });

  it("every builder is reachable from the gallery (blank excepted)", () => {
    const metaIds = new Set(TEMPLATE_META.map((t) => t.id));
    for (const id of listBuilderIds()) {
      if (id === "blank") continue;
      expect(metaIds.has(id), `orphaned builder "${id}"`).toBe(true);
    }
  });
});
