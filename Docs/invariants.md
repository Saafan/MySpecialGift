# Invariants

Contracts the codebase must not break. Each one maps to a V1 failure documented
under `docs/reverse-engineering/`. Unit tests guard the ones that can be
asserted without a browser; the rest are structural — keep the comments and
single write-path intact when you touch these areas.

## Money & commerce

| Invariant | Where | Test / guard |
| --- | --- | --- |
| Money is integer cents — never IEEE-754 floats | `prisma/schema.prisma`, `src/server/pricing.ts` | `pricing.test.ts` |
| Tax = 10% of subtotal; shipping = $5.99 unless subtotal **>** $50 | `quoteOrder` | `pricing.test.ts` |
| An order must contain ≥1 item (V1 charged shipping on empty carts) | `placeOrder` | checkout E2E + code comment |
| Never accept client `unitPrice` / totals | cart stores refs only; `placeOrder` re-quotes from `products.priceCents` | code review + checkout E2E |
| Clear the cart only after a successful charge | `placeOrder` | checkout E2E |
| Payment never collects card PAN in this app | `PaymentProvider` + checkout UI | mock provider + Stripe seam throws if keys set without adapter |

## Auth & tenancy

| Invariant | Where | Test / guard |
| --- | --- | --- |
| Identity comes from the session cookie → DB, never a client header | `session.ts`, every server action | middleware is UX only; `requireUser` is the boundary |
| Session token is random; DB stores SHA-256 only | `session.ts` | code |
| Ownership miss ≡ not found (no existence probing) | designs / orders pages & actions | code |
| Single tenant — no `tenantId` columns | schema | schema |

## Geometry & editor

| Invariant | Where | Test / guard |
| --- | --- | --- |
| Category print sizes live in one module; DB joins by slug | `src/lib/geometry.ts` | `geometry.test.ts` |
| Mug 2D artboard aspect ≡ 3D print-band aspect (~2.934) | `ARTBOARD_SIZES.cup` ↔ `mugBandAspectRatio()` | `geometry.test.ts` |
| Mug wall radii shared by artboard math and Babylon lathe | `MUG_WALL_CONTROL` / `buildMugProfile` | comments + geometry test |
| Template meta ids match builder ids | `template-meta.ts` ↔ `template-builders.ts` | `template-sync.test.ts` |
| Programmatic Fabric `.set()` goes through `mutateObject` (BUG-P01) | `use-fabric-mutation.ts` | mechanism, not convention |
| NumberInput commits on blur / Enter, not every keystroke | `number-input.tsx` | `number-input.test.tsx` |
| Fabric `customProperties` includes `id`, `selectable`, `evented`, `shapeName` | `use-fabric-canvas.ts` | D-1 |
| Non-same-origin images set `crossOrigin = "anonymous"` | `fabric-helpers.ts` | D-5 (untainted canvas) |
| SVG sources are rasterised before landing on the canvas | `fabric-helpers.ts` | D-4 |
| Image `objectCaching: false` | `fabric-helpers.ts` | D-41 |

## 3D preview

Preserve the defensive behaviours in `src/lib/editor/product-3d.ts` (scene,
engine, print texture lifecycle) and `src/lib/editor/product-models/` (one
procedural builder per category): texture flips for UV orientation, print-band
epsilon against z-fighting, earcut for polygon triangulation, dispose of
engine/scene/textures on unmount, and demand-rendering after shaders compile.
Breaking any of these quietly produces a black, stretched, or leaking WebGL
canvas.

Performance budget, so the preview runs on low-end phones:

- No post-processing pipeline and no shadow maps. Contact shadows are baked
  once into a small texture (`buildContactShadows`).
- Hardware scaling is `1 / min(devicePixelRatio, tierCap)`; Babylon's level
  is absolute, so `1` means CSS resolution, not device resolution.
- Tessellation and procedural texture sizes scale with the quality tier
  (`segments`, `textureSize`); low tier also drops clear-coat and sheen.
- Static meshes freeze world matrices; non-print materials freeze after the
  scene is ready.
- Model UVs are image space (u left→right, v top→bottom) because design
  textures load with `invertY = false`.

## Uploads

- Client may downscale; server still enforces MIME / size.
- Files are served only via `/api/files/[...key]` after ownership checks on
  upload create; never trust a raw filesystem path from the client.
