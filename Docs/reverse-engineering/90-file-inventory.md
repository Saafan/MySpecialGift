# 90 — Full File Inventory

[← Index](./00-index.md)

Every first-party file with a one-line purpose statement, plus a catalogue entry for every binary asset. Generated files, `node_modules`, and browser-automation artifacts are summarised in aggregate at the end.

**Total files excluding `node_modules`: 1,253.** Coverage policy and exclusions are stated in [02](./02-repository-overview.md#coverage-statement).

---

## Root

| File | Bytes | Purpose |
|------|------:|---------|
| `package.json` | 1,164 | Root workspace manifest. Declares `apps/*` + `packages/*` workspaces, 14 scripts, 4 devDeps, Node ≥20, npm@10.0.0 |
| `package-lock.json` | 844,854 | lockfileVersion 3, 1,648 entries, 100 % `registry.npmjs.org`, no overrides/resolutions/patches |
| `turbo.json` | 414 | Turborepo pipeline: `build` (outputs `.next/**`, `dist/**`), `lint`, `dev` (persistent, uncached), `test` |
| `tsconfig.json` | 455 | Root TS config — ES2022, strict, noEmit. **Extended by neither app** |
| `docker-compose.yml` | 3,136 | 6 services: postgres:5433, redis:6379, minio:9000/9001, medusa:9000 (profile `medusa`), api:4000 + web:3000 (profile `app`) |
| `playwright.config.ts` | 619 | E2E config — `testDir ./e2e`, chromium, workers 1. **baseURL 3001 ≠ dev:web 3000** |
| `.env.example` | 808 | 15-key env template. **`DATABASE_URL` port 5432 ≠ Compose 5433**; contains literal dev credentials |
| `.gitignore` | 500 | 53 lines. **Line 48 excludes `apps/api/prisma/migrations/`** |
| `README.md` | 4,363 | Project overview. 12 stale claims — see [19](./19-missing-documentation.md#a2-readmemd--inaccuracies) |
| `TEST_REPORT.md` | 8,997 | Deep QA report, 2026-05-31. Source for BUG-T01/T02/D01/D02/P01 and the BUG-E series references |
| `QA_AUDIT_REPORT.md` | 6,245 | QA audit, 2026-05-31. Source for BUG #1–#9. **The richest historical document in the repo** |

### Root-level binary artifacts {#root-level-binary-artifacts}

14 PNG screenshots, 2,196,370 bytes total, **not gitignored**, referenced by nothing.

| File | Bytes | Captured |
|------|------:|----------|
| `test-homepage.png` | 284,881 | 2026-05-31 22:48 |
| `final-test.png` | 166,657 | 2026-05-31 22:45 |
| `test-product-detail.png` | 165,246 | 2026-05-31 23:03 |
| `test-text-added.png` | 165,156 | 2026-05-31 22:50 |
| `test-editor.png` | 164,816 | 2026-05-31 22:50 |
| `test-cart.png` | 159,852 | 2026-05-31 22:53 |
| `test-shape-added.png` | 156,946 | 2026-05-31 22:50 |
| `products-page.png` | 154,187 | 2026-06-01 01:54 |
| `stroke-test.png` | 147,777 | 2026-05-31 22:21 |
| `test-checkout.png` | 144,027 | 2026-05-31 22:55 |
| `undo-test.png` | 125,790 | 2026-05-31 22:20 |
| `redo-test.png` | 125,537 | 2026-05-31 22:20 |
| `test-checkout-payment.png` | 121,073 | 2026-05-31 22:55 |
| `test-checkout-review.png` | 114,425 | 2026-05-31 22:56 |

---

## `.cursor/` — 2 files

| File | Bytes | Purpose |
|------|------:|---------|
| `rules/browser-testing.mdc` | 632 | Cursor rule: prefer Playwright CLI over MCP; documents port 3000 |
| `skills/playwright-cli/SKILL.md` | 2,333 | Agent skill: session workflow, key-routes table, command reference. **Accurate** |

## `.github/` — 35 files

| File | Bytes | Purpose |
|------|------:|---------|
| `copilot-instructions.md` | 40,104 | 1,135-line "single source of truth for all AI agents". **~35 inaccuracies** — see [19](./19-missing-documentation.md#a3-githubcopilot-instructionsmd--inaccuracies) |
| `prompts/deep-test-report.prompt.md` | 11,165 | The QA-agent prompt that produced `TEST_REPORT.md`. Its file list is a 2026-06-01 snapshot |
| `prompts/ui-ux-pro-max/PROMPT.md` | 10,535 | Vendored design-toolkit workflow documentation |
| `prompts/ui-ux-pro-max/scripts/core.py` | 10,227 | BM25 index + CSV schema config (`:17-61`) |
| `prompts/ui-ux-pro-max/scripts/search.py` | 5,478 | CLI entry point; `--design-system --persist` writes `design-system/{slug}/MASTER.md` |
| `prompts/ui-ux-pro-max/scripts/design_system.py` | 43,614 | Design-system assembler and persister |
| `prompts/ui-ux-pro-max/scripts/__pycache__/*.pyc` | 164,741 | **5 compiled-bytecode files for CPython 3.11 and 3.14. Binary, committed** |
| `prompts/ui-ux-pro-max/data/*.csv` | ~430,000 | **24 vendored reference datasets** (catalogued, not read): `styles.csv` 96,553 · `typography.csv` 31,877 · `ui-reasoning.csv` 31,071 · `products.csv` 29,790 · `ux-guidelines.csv` 18,766 · `nuxtjs.csv` 16,539 · `shadcn.csv` 15,921 · `react-performance.csv` 14,822 · `landing.csv` 14,390 · `nuxt-ui.csv` 14,010 · `icons.csv` 13,384 · `react.csv` 13,016 · `nextjs.csv` 12,546 · `astro.csv` 11,868 · `html-tailwind.csv` 11,361 · `svelte.csv` 11,063 · `vue.csv` 11,056 · `swiftui.csv` 10,872 · `flutter.csv` 10,469 · `react-native.csv` 10,035 · `colors.csv` 9,713 · `jetpack-compose.csv` 8,195 · `charts.csv` 7,654 · `web-interface.csv` 7,472 |

## `design-system/` — 1 file

| File | Bytes | Purpose |
|------|------:|---------|
| `mylovelygift/MASTER.md` | 5,375 | Generated 2026-05-30 by ui-ux-pro-max. **Its palette contradicts the implementation entirely** |

## `docker/` — 2 files

| File | Bytes | Purpose |
|------|------:|---------|
| `Dockerfile.api` | 430 | 2-stage node:20-alpine; runs `prisma generate` then `nest build`. **`npm ci` needs a lockfile the build context lacks** |
| `Dockerfile.web` | 571 | 2-stage, non-root `nextjs` user, EXPOSE 3000. **Copies `.next/standalone`, which `next.config.js` never produces** |

## `e2e/` — 2 files

| File | Bytes | Purpose |
|------|------:|---------|
| `bug-regression.spec.ts` | 3,873 | 9 tests, one per `QA_AUDIT_REPORT.md` bug. **At least 3 assert strings that no longer exist** |
| `user-journey.spec.ts` | 44,580 | 100 tests across 18 phases, serial, shared page. **At least 5 assertions reference removed features** |

## `packages/types/` — 4 files

| File | Bytes | Purpose |
|------|------:|---------|
| `package.json` | 143 | `main`/`types` → `./src/index.ts`. **No deps, no scripts** |
| `jest.config.ts` | 224 | ts-jest, node env |
| `src/index.ts` | 2,848 | 12 interfaces + `OrderStatus`. **Zero consumers** |
| `tests/types.spec.ts` | 6,969 | 17 compile-time + runtime type tests. **All passing** |

---

## `apps/api/` — 61 first-party files (+145 generated in `dist/`)

### Configuration

| File | Bytes | Purpose |
|------|------:|---------|
| `package.json` | 1,854 | 10 scripts, 24 runtime deps, 14 dev deps, `prisma.seed` hook |
| `tsconfig.json` | 656 | CommonJS, decorators, `@/*`→`src/*`, `@test/*`→`tests/*` |
| `nest-cli.json` | 179 | `sourceRoot: src`, `deleteOutDir: true` |
| `jest.config.ts` | 627 | ts-jest, `.*\.spec\.ts$`, roots `tests` + `src`, excludes `main.ts` from coverage |
| `.env` | 527 | **Real env file with credentials.** Gitignored by `.gitignore:28` |
| `.turbo/turbo-build.log` | 1,959 | **A captured FAILING build with 4 TypeScript errors** — key historical evidence |

### Database

| File | Bytes | Purpose |
|------|------:|---------|
| `prisma/schema.prisma` | 7,251 | 282 lines. 12 models, 6 enums. Single source of DB truth |
| `prisma/seed.ts` | 6,913 | Seeds 1 tenant, 4 categories, 4 products, 6 templates. **Templates use `create`, not `upsert`** |
| `prisma/migrations/migration_lock.toml` | 126 | `provider = "postgresql"`; warns it should be in version control |
| `prisma/migrations/20260530232216_init/migration.sql` | 9,731 | 284 lines. 6 enums, 12 tables, 10 indexes, 14 FKs. **The only migration** |

### Source — 24 files

| File | Bytes | Purpose |
|------|------:|---------|
| `src/main.ts` | 1,314 | Bootstrap: helmet, compression, CORS, ValidationPipe, prefix `api/v1`, Swagger at `/api/docs`, listen |
| `src/app.module.ts` | 879 | Root module. ConfigModule + 8 feature/common modules |
| `src/common/prisma/prisma.module.ts` | 219 | `@Global` module exporting `PrismaService` |
| `src/common/prisma/prisma.service.ts` | 370 | `PrismaClient` subclass with connect/disconnect lifecycle hooks |
| `src/common/medusa/medusa.module.ts` | 219 | `@Global` module exporting `MedusaService` |
| `src/common/medusa/medusa.service.ts` | 1,208 | Medusa client wrapper, 6 methods. **No route reaches any of them** |
| `src/modules/auth/auth.module.ts` | 277 | Auth module |
| `src/modules/auth/auth.controller.ts` | 1,527 | `POST /auth/login`, `POST /auth/register` |
| `src/modules/auth/auth.service.ts` | 3,509 | scrypt hashing, timing-safe verification, tenant resolution, HMAC token generation. **No verification function** |
| `src/modules/products/products.module.ts` | 309 | Products module |
| `src/modules/products/products.controller.ts` | 1,526 | `GET /products`, `/:id`, `/slug/:slug` |
| `src/modules/products/products.service.ts` | 2,462 | findAll/findOne/findBySlug + **3 unexposed CRUD methods**. The only service leaking Prisma types |
| `src/modules/templates/templates.module.ts` | 317 | Templates module |
| `src/modules/templates/templates.controller.ts` | 1,609 | 4 GET routes |
| `src/modules/templates/templates.service.ts` | 1,909 | 4 read methods + **1 unexposed create method** |
| `src/modules/designs/designs.module.ts` | 301 | Designs module |
| `src/modules/designs/designs.controller.ts` | 1,824 | Full CRUD + finalize, all keyed on `x-user-id` |
| `src/modules/designs/designs.service.ts` | 1,511 | CRUD with ownership checks against the unverified header |
| `src/modules/orders/orders.module.ts` | 293 | Orders module |
| `src/modules/orders/orders.controller.ts` | 1,265 | `GET /orders`, `/:id`, `POST /orders`. **Accepts client `unitPrice`** |
| `src/modules/orders/orders.service.ts` | 2,250 | **The only real business logic**: 10 % tax, $50 free-shipping threshold, $5.99 flat. Plus an unexposed `updateStatus` |
| `src/modules/assets/assets.module.ts` | 293 | Assets module |
| `src/modules/assets/assets.controller.ts` | 1,327 | upload-url / confirm / delete. **Delete has no ownership check** |
| `src/modules/assets/assets.service.ts` | 2,421 | S3 presigning, DB record creation, S3+DB delete |

### Tests — 23 files, 146 passing tests

| File | Bytes | Purpose |
|------|------:|---------|
| `tests/builders/index.ts` | 9,286 | 7 fluent builders (User, Product, Design, Order, OrderItem, Asset, DesignTemplate) |
| `tests/fixtures/index.ts` | 3,067 | Static fixture object. **Zero importers — dead** |
| `tests/helpers/test-utils.ts` | 559 | `createTestingModule()`. **Zero importers — dead** |
| `tests/mocks/index.ts` | 156 | Barrel re-exporting 3 mocks |
| `tests/mocks/prisma.mock.ts` | 1,145 | Hand-rolled Prisma mock, 8 models |
| `tests/mocks/medusa.mock.ts` | 298 | 6 jest.fn stubs |
| `tests/mocks/config.mock.ts` | 629 | ConfigService with 8 keys |
| `tests/mocks/s3.mock.ts` | 599 | S3 + presigner mocks. **Zero importers — duplicated inline in `assets.service.spec.ts:10-26`** |
| `tests/unit/common/prisma.service.spec.ts` | 1,190 | 6 tests |
| `tests/unit/common/medusa.service.spec.ts` | 4,291 | 6 tests |
| `tests/unit/modules/auth/auth.service.spec.ts` | 11,211 | 20 tests incl. scrypt round-trips and token structure |
| `tests/unit/modules/auth/auth.controller.spec.ts` | 6,051 | 9 tests incl. "does not expose password hash" |
| `tests/unit/modules/products/products.service.spec.ts` | 8,925 | 15 tests |
| `tests/unit/modules/products/products.controller.spec.ts` | 3,547 | 5 tests |
| `tests/unit/modules/templates/templates.service.spec.ts` | 8,027 | 12 tests |
| `tests/unit/modules/templates/templates.controller.spec.ts` | 4,171 | 5 tests |
| `tests/unit/modules/designs/designs.service.spec.ts` | 8,669 | 14 tests incl. all ownership cases |
| `tests/unit/modules/designs/designs.controller.spec.ts` | 4,435 | 7 tests |
| `tests/unit/modules/orders/orders.service.spec.ts` | 11,019 | 15 tests incl. every pricing boundary |
| `tests/unit/modules/orders/orders.controller.spec.ts` | 3,246 | 4 tests |
| `tests/unit/modules/orders/order-business-rules.spec.ts` | 4,260 | 4 integration-style pricing tests |
| `tests/unit/modules/assets/assets.service.spec.ts` | 7,831 | 12 tests incl. unicode filenames |
| `tests/unit/modules/assets/assets.controller.spec.ts` | 2,731 | 3 tests |

---

## `apps/web/` — 77 first-party files (+547 generated in `.next/`)

### Configuration

| File | Bytes | Purpose |
|------|------:|---------|
| `package.json` | 1,912 | 6 scripts, 31 runtime deps, 17 dev deps |
| `next.config.js` | 341 | `reactStrictMode: true`, 2 image `remotePatterns`. **No `output: "standalone"`** |
| `tsconfig.json` | 761 | 5 path aliases; `include` covers `**/*.ts` (which pulls in `jest.config.ts`) |
| `tailwind.config.ts` | 4,645 | 158 lines: full palette, 3 font families, radii, 6 keyframes, 6 animations, `tailwindcss-animate` |
| `postcss.config.js` | 89 | tailwindcss + autoprefixer |
| `jest.config.ts` | 701 | **BROKEN at line 9 (transform tuple) and line 16 (`setupFilesAfterFramework` is not a Jest option)** |
| `.env.local` | 81 | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TENANT_ID` |
| `next-env.d.ts` | 233 | Generated Next type reference |
| `tsconfig.tsbuildinfo` | 273,600 | Incremental compilation cache |
| `.turbo/turbo-build.log` | 427 | Historical: records the since-removed `experimental.serverActions` option |

### Source — 37 files

#### `src/app/` — routing, 14 files

| File | Bytes | Purpose |
|------|------:|---------|
| `layout.tsx` | 734 | Root layout: metadata, `<html lang="en">`, Providers, Sonner Toaster |
| `page.tsx` | 9,344 | Homepage (Server Component). Hero, 4 categories, 4 featured products, how-it-works |
| `providers.tsx` | 545 | `QueryClientProvider`, staleTime 60 s. **Zero query consumers** |
| `globals.css` | 2,248 | Google Fonts `@import`, Tailwind layers, 19 CSS variables, 6 component classes, 1 utility |
| `(auth)/auth/login/page.tsx` | 7,891 | Login form + 2 inert social buttons |
| `(auth)/auth/register/page.tsx` | 5,622 | Registration with client-side password validation |
| `(auth)/auth/forgot-password/page.tsx` | 4,077 | Calls a nonexistent endpoint; always shows success |
| `(editor)/editor/[productId]/page.tsx` | 1,391 | Editor shell — toolbar + 3-column flex |
| `(shop)/products/page.tsx` | 10,563 | Catalogue: 8 hardcoded products, tabs, filter popover, sort, price range |
| `(shop)/products/[id]/page.tsx` | 11,306 | Detail page. **150 of 298 lines are a hardcoded catalogue** |
| `(shop)/templates/page.tsx` | 6,156 | Template gallery (Server Component), 4 categories × 3–5 templates |
| `(shop)/cart/page.tsx` | 7,198 | Cart with quantity steppers and an order summary |
| `(shop)/checkout/page.tsx` | 19,167 | 3-step wizard. **"Place Order" is a `setTimeout`** |
| `(shop)/my-designs/page.tsx` | 7,594 | localStorage-driven design list with an auth gate. **The Edit link is broken** |

#### `src/components/` — 11 files

| File | Bytes | Purpose |
|------|------:|---------|
| `editor/editor-canvas.tsx` | 17,722 | 🔴 Fabric bootstrap, 11 event handlers, pan/zoom, 7 keyboard shortcuts, artboard migration, persistence |
| `editor/editor-left-panel.tsx` | 25,983 | 🟠 Icon rail + 7 tool panels (Templates, Uploads, Text, Shapes, Images, Backgrounds, Layers) in one file |
| `editor/editor-right-panel.tsx` | 32,568 | 🔴 **The largest file.** Property inspector; its architecture is BUG-P01's fix |
| `editor/editor-toolbar.tsx` | 7,893 | Save, undo/redo, tools, zoom, preview, export, info, add-to-cart |
| `editor/editor-3d-preview.tsx` | 10,839 | 🔴 Babylon React wrapper, quality tiering, capture pipeline, thumbnail + modal |
| `editor/print-area-panel.tsx` | 5,554 | Print width/height sliders + inputs + reset-to-max |
| `layout/navbar.tsx` | 5,256 | Sticky glass navbar, search, cart badge, mobile drawer |
| `layout/footer.tsx` | 3,097 | 4-column footer. **8 inert `<span>` links** |
| `ui/button.tsx` | 2,304 | CVA button — 8 variants × 5 sizes + `asChild` |
| `ui/input.tsx` | 893 | Styled input, no extra props |
| `ui/card.tsx` | 2,043 | 6 card sub-components. **Zero importers — dead file** |

#### `src/lib/` — 9 files

| File | Bytes | Purpose |
|------|------:|---------|
| `product-3d.ts` | 22,053 | 🔴 Babylon scene factory: 4 product meshes, procedural cotton, IBL, on-demand render loop. **11 defensive items** |
| `editor-templates.ts` | 11,657 | 13 template definitions with bounds-relative positioning |
| `editor-artboard.ts` | 4,143 | Artboard bounds, layout, background, z-order, export crop. **Imports the store** |
| `fabric-objects.ts` | 2,754 | Origin normalisation, image loading, SVG rasterisation. **4 defensive items** |
| `api.ts` | 2,676 | Axios instance + 5 API namespaces. **Only the raw `api` export is used** |
| `product-catalog.ts` | 2,010 | `ARTBOARD_SIZES`, id→category map, 12 category aliases, `resolveProductCategory` |
| `product-print-limits.ts` | 1,539 | `MUG_3D_PRINT` constants, print limits, clamping |
| `canvas-viewport.ts` | 1,452 | Zoom clamping, `zoomToPoint`, pan clamping, viewport reset |
| `utils.ts` | 175 | `cn()` — clsx + tailwind-merge |

#### `src/store/` and `src/types/` — 3 files

| File | Bytes | Purpose |
|------|------:|---------|
| `store/editor-store.ts` | 6,244 | Canvas ref, zoom, tools, panels, print dimensions, undo/redo. **A dead layer subsystem** |
| `store/cart-store.ts` | 1,864 | Persisted cart. **`isOpen`/`toggleCart` are dead** |
| `types/earcut.d.ts` | 183 | Ambient module declaration for the untyped `earcut` package |

### Tests — 4 files, **none have ever executed**

| File | Bytes | Purpose |
|------|------:|---------|
| `tests/unit/store/editor-store.spec.ts` | 15,786 | ~45 tests. **10 cover the dead layer API; 4 assert wrong zoom clamps** |
| `tests/unit/store/cart-store.spec.ts` | 10,243 | 36 well-written behavioural tests |
| `tests/unit/lib/api.spec.ts` | 4,383 | 22 `toBeDefined()` shape assertions — **cannot fail** |
| `tests/unit/lib/utils.spec.ts` | 2,684 | 17 real assertions on `cn()` |

### Public assets — 30 files, 5,553,777 bytes

#### 3D assets — 4 binaries, 5,531,629 B (99.6 % of all asset weight)

| File | Bytes | Format | Referenced at |
|------|------:|--------|---------------|
| `3d/wood-table.jpg` | 3,416,568 | JPEG | `product-3d.ts:508` — table PBR base texture |
| `3d/studio-bg.jpg` | 1,625,514 | JPEG | `product-3d.ts:457` — full-screen backdrop `Layer` |
| `3d/studio.env` | 273,974 | Babylon prefiltered IBL cube map | `product-3d.ts:465` — environment lighting |
| `3d/wood_diff.jpg` | 215,573 | JPEG | ❌ **UNREFERENCED — dead asset** |

#### Icon — 1 SVG

| File | Bytes | viewBox | Referenced at |
|------|------:|---------|---------------|
| `favicon.svg` | 423 | `0 0 32 32` | `layout.tsx:11`. **Added by BUG #7** |

#### Product thumbnails — 8 SVGs, all `viewBox 0 0 400 400`

| File | Bytes | Referenced at |
|------|------:|---------------|
| `products/mug-white.svg` | 1,098 | `page.tsx:39`, `products/page.tsx:12`, `products/[id]/page.tsx:23` |
| `products/tshirt-premium.svg` | 1,021 | `products/page.tsx:15`, `products/[id]/page.tsx:86` |
| `products/tshirt-white.svg` | 968 | `page.tsx:46`, `products/page.tsx:14`, `products/[id]/page.tsx:66` |
| `products/badge-square.svg` | 867 | `products/page.tsx:19`, `products/[id]/page.tsx:154` |
| `products/sticker-diecut.svg` | 836 | `products/page.tsx:17`, `products/[id]/page.tsx:121` |
| `products/mug-black.svg` | 815 | `products/page.tsx:13`, `products/[id]/page.tsx:48` |
| `products/sticker-circle.svg` | 805 | `page.tsx:53`, `products/page.tsx:16`, `products/[id]/page.tsx:104` |
| `products/badge-pin.svg` | 775 | `page.tsx:60`, `products/page.tsx:18`, `products/[id]/page.tsx:137` |

#### Stock clip-art — 6 SVGs, all `viewBox 0 0 200 200`

All referenced at `editor-left-panel.tsx:425-430`.

| File | Bytes |
|------|------:|
| `stock/stars.svg` | 488 |
| `stock/person.svg` | 416 |
| `stock/smiley.svg` | 381 |
| `stock/photo-frame.svg` | 373 |
| `stock/landscape.svg` | 311 |
| `stock/heart.svg` | 247 |

#### Template thumbnails — 11 SVGs, all `viewBox 0 0 300 400`

Each referenced twice: once in `templates/page.tsx` (gallery) and once in `editor-templates.ts` (editor panel).

| File | Bytes | Gallery | Editor |
|------|------:|---------|--------|
| `templates/birthday-cup.svg` | 1,439 | `:14` | `:84` |
| `templates/coffee-cup-1.svg` | 1,343 | `:15` | `:104` |
| `templates/photo-mug.svg` | 1,182 | `:17` | `:142` |
| `templates/fashion-tee.svg` | 1,117 | `:29` | `:204` |
| `templates/event-badge.svg` | 1,099 | `:51` | `:296` |
| `templates/corporate-cup.svg` | 1,095 | `:16` | `:123` |
| `templates/event-tee.svg` | 1,033 | `:28` | `:184` |
| `templates/logo-sticker.svg` | 1,029 | `:39` | `:226` |
| `templates/name-badge.svg` | 1,025 | `:50` | `:273` |
| `templates/product-sticker.svg` | 1,002 | `:40` | `:247` |
| `templates/sports-tee.svg` | 960 | `:27` | `:166` |

**Asset audit result: 1 unreferenced asset (`wood_diff.jpg`, 215,573 B). Zero referenced-but-missing assets** — every `src`/`href` in the code resolves to a file that exists.

---

## Aggregate — catalogued, not read

| Region | Files | Bytes | Contents |
|--------|------:|------:|----------|
| `apps/web/.next/` | 547 | 133,403,561 | Next.js build output: 350 `.js`, 48 `.map`, 37 `.gz`, chunk manifests, build traces. Gitignored, regenerable |
| `apps/api/dist/` | 145 | 1,102,103 | `tsc` output mirroring `src/**` (which was read in full). Gitignored, regenerable |
| `.playwright-cli/` | 251 | 28,502,756 | 92 PNG screenshots, ~130 accessibility-snapshot `.yml`, ~30 console `.log`. Gitignored (`.gitignore:42`). **Filenames are strong historical evidence** — see [13](./13-historical-bug-report.md#41--timeline-reconstructed-without-git) |
| `.playwright-mcp/` | 101 | 2,701,706 | Same category from the earlier MCP workflow: 34 console `.log`, 60 page `.yml`, 7 PNG. **Not gitignored** |
| `.turbo/` | 0 tracked | — | Turborepo daemon cache directory |
| `node_modules/` | not counted | — | 982 top-level packages |

### `.playwright-cli/` filename groups (historical evidence)

| Group | Count | Examples | Indicates |
|-------|------:|----------|-----------|
| Mug 3D | ~45 | `cup-3d-big/front/modal.png`, `cup-fix.png`, `cup-fix1/2/3.png`, `cup-newbg.png`, `cup-rot.png`, `cup-top.png`, `cup.yml`, `cup0/2/3/4/5/6.yml`, `cupbg.yml`, `cupr.yml`, `mug2.png`, `mug3d.png`, `mug-modal.png`, `fix3d.png`, `grey1/2/3.png` | **The highest-churn area in the project** |
| Print-area sizing | ~20 | `w1.png`, `w1-back.png`, `w1-back2.png`, `h1.png`, `h1-side.png`, `s.yml`, `s2.yml`, `fix-s.yml`, `fix-s2.yml`, `fix-s3.yml`, `a1/a2/a3.yml`, `m.yml`, `fullbleed1.png`, `dyn1.png` | The last thing being worked on, 2026-06-21 |
| 3D modals | ~14 | `badge-modal.png/2/3`, `sticker-modal.png/2`, `tshirt-modal.png/2/3/4`, `babylon-modal.png` | Per-product modal iteration |
| Editor images | ~10 | `canvas-with-image.png`, `editor-with-image.png`, `editor-image-fixed.png`, `after-image.yml`, `filters-test.png` | Corroborates the SVG-rasterisation fix (D-4) |
| Backgrounds | ~6 | `bg-panel.png/.yml`, `bg-panel2.yml`, `bg-tab.png/.yml` | Corroborates the store-sync fix (D-20) |
| Undo/redo | ~6 | `undo1.png`, `undo2.png`, `revert1.png` | Undo work |
| Shapes/stroke | ~4 | `shapes.yml`, `shapes-tab.yml`, `editor-after-shape.png` | Corroborates BUG-E01/E04 |
| Layers | 1 | `layers-locked.yml` | Corroborates the `customProperties` fix (D-1) |
| Large console logs | 5 | `console-2026-06-21T14-15-51-927Z.log` (1.27 MB), `T13-42-59` (914 KB), `T14-38-22` (604 KB), `T14-32-45` (378 KB), `T14-44-04` (304 KB) | **Unread. See [21, OQ-09](./21-open-questions.md) — the highest-value unanswered question** |
