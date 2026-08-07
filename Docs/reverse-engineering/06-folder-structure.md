# 06 — Folder Structure

[← Index](./00-index.md)

## Organising principle

The repository uses a **hybrid** scheme, and the two halves disagree with each other:

- **Backend (`apps/api/src`) is by-feature.** Each domain gets a self-contained module directory with a `module.ts` / `controller.ts` / `service.ts` triple. This is consistent across all six modules with zero deviations.
- **Frontend (`apps/web/src`) is by-type.** `app/` (routes), `components/` (all components, sub-grouped by area), `lib/` (utilities), `store/` (state), `types/` (declarations). Editor logic is split across `components/editor/` and `lib/` with no clear rule for which goes where.

The monorepo top level follows the standard **`apps/` + `packages/`** convention (`package.json:6-9`).

---

## Annotated tree

Build output (`apps/web/.next/`, `apps/api/dist/`) and `node_modules/` are omitted; browser-automation artifact directories are summarised rather than expanded.

```
MyLovelyGift/
│
├── package.json                    Root workspace manifest. Declares workspaces, 14 scripts,
│                                   4 devDeps, Node ≥20, npm@10.0.0 pin.
├── package-lock.json               844 KB, lockfileVersion 3, 1,648 entries, all from npmjs.org.
├── turbo.json                      4 tasks: build/lint/dev/test. build outputs .next/** and dist/**.
├── tsconfig.json                   Root TS config — ES2022, strict, noEmit. NOT extended by
│                                   either app; both apps define their own from scratch.
├── docker-compose.yml              6 services. postgres:5433, redis:6379, minio:9000/9001,
│                                   medusa:9000 (profile "medusa"), api:4000 + web:3000
│                                   (profile "app"). ⚠ minio and medusa both claim host 9000.
├── playwright.config.ts            E2E config. testDir ./e2e, chromium only, workers 1.
│                                   ⚠ baseURL http://localhost:3001 but dev:web serves 3000.
├── .env.example                    Template env, 15 keys. ⚠ DATABASE_URL uses port 5432 while
│                                   docker-compose publishes 5433. Contains literal dev secrets.
├── .gitignore                      53 lines. ⚠ Line 48 excludes apps/api/prisma/migrations/.
├── README.md                       4.4 KB project overview. Several stale claims — see [19].
├── TEST_REPORT.md                  Deep QA report, 2026-05-31. Source for BUG-T01/T02/D01/D02/P01.
├── QA_AUDIT_REPORT.md              QA audit, 2026-05-31. Source for BUG #1–#9.
├── *.png (×14, 2.2 MB)             Loose screenshot artifacts at repo root. NOT gitignored.
│                                   test-homepage.png, test-cart.png, test-checkout*.png,
│                                   test-editor.png, test-product-detail.png, test-shape-added.png,
│                                   test-text-added.png, undo-test.png, redo-test.png,
│                                   stroke-test.png, final-test.png, products-page.png.
│
├── .cursor/                        Cursor IDE agent configuration.
│   ├── rules/browser-testing.mdc   Rule: prefer Playwright CLI over MCP for token efficiency.
│   └── skills/playwright-cli/
│       └── SKILL.md                Skill doc: session workflow, key routes table, commands.
│
├── .github/                        ⚠ Contains NO workflows, NO issue/PR templates.
│   ├── copilot-instructions.md     1,135 lines / 40 KB. Declared "single source of truth for all
│   │                               AI agents". Contains ~14 claims contradicted by the code — [03].
│   └── prompts/
│       ├── deep-test-report.prompt.md   QA-agent prompt that produced TEST_REPORT.md.
│       └── ui-ux-pro-max/          Vendored third-party design-recommendation toolkit (678 KB).
│           ├── PROMPT.md           Workflow doc for the toolkit.
│           ├── data/*.csv (×24)    Reference dataset: 67 styles, 96 palettes, 57 font pairings,
│           │                       99 UX guidelines, 25 chart types, 13 stack guides.
│           └── scripts/
│               ├── core.py         BM25 index + CSV schema config.
│               ├── search.py       CLI entry point.
│               ├── design_system.py  Design-system generator + persister (43 KB).
│               └── __pycache__/*.pyc (×5)  ⚠ Compiled bytecode committed; cpython-311 AND -314.
│
├── .playwright-cli/  (251 files, 28.5 MB)   Browser-automation artifacts. Gitignored (.gitignore:42).
│                                   92 PNGs, ~130 accessibility-snapshot .yml, ~30 console .log.
│                                   Filenames are strong historical evidence — see [13].
├── .playwright-mcp/  (101 files, 2.7 MB)    Same, from an earlier MCP-based workflow.
│                                   ⚠ NOT gitignored.
├── .turbo/                         Turborepo daemon cache directory (empty of tracked files).
│
├── apps/
│   ├── api/                        NestJS 10 backend. Deployable artifact #1.
│   │   ├── package.json            10 scripts, 24 runtime deps, 14 dev deps, prisma.seed hook.
│   │   ├── tsconfig.json           CommonJS, decorators on, paths @/*→src/*, @test/*→tests/*.
│   │   ├── nest-cli.json           sourceRoot src, deleteOutDir true.
│   │   ├── jest.config.ts          ts-jest, testRegex .*\.spec\.ts$, roots tests+src.
│   │   ├── .env                    ⚠ Real env file present in tree. 14 keys incl. credentials.
│   │   ├── .turbo/turbo-build.log  ⚠ Historical artifact: records a FAILED build with 4 TS errors.
│   │   ├── prisma/
│   │   │   ├── schema.prisma       282 lines. 12 models, 6 enums. Single source of DB truth.
│   │   │   ├── seed.ts             242 lines. 1 tenant, 4 categories, 4 products, 6 templates.
│   │   │   └── migrations/         ⚠ Excluded by .gitignore:48 despite migration_lock.toml
│   │   │       ├── migration_lock.toml       saying it "should be added to version control".
│   │   │       └── 20260530232216_init/migration.sql   284 lines. The ONLY migration.
│   │   ├── src/
│   │   │   ├── main.ts             Bootstrap: helmet, compression, CORS, ValidationPipe,
│   │   │   │                       global prefix api/v1, Swagger at /api/docs, listen(PORT|4000).
│   │   │   ├── app.module.ts       Root module. Imports ConfigModule + 8 feature/common modules.
│   │   │   ├── common/             Cross-cutting infrastructure (2 @Global modules).
│   │   │   │   ├── prisma/{module,service}.ts   PrismaService extends PrismaClient; connect/disconnect.
│   │   │   │   └── medusa/{module,service}.ts   Medusa HTTP client wrapper. ⚠ No route reaches it.
│   │   │   └── modules/            Six by-feature domains, all identically shaped.
│   │   │       ├── auth/           register, login, hashPassword (scrypt), generateToken (HMAC).
│   │   │       ├── products/       findAll/findOne/findBySlug (+ create/update/delete, unexposed).
│   │   │       ├── templates/      categories, category-by-slug, design templates, one by id.
│   │   │       ├── designs/        Full CRUD + finalize. Ownership check via x-user-id.
│   │   │       ├── orders/         list, get, create (pricing rules live here).
│   │   │       └── assets/         Presigned upload URL, confirm, delete.
│   │   └── tests/                  23 files. ✅ 15 suites / 146 tests, all passing.
│   │       ├── builders/index.ts   7 fluent builders (User/Product/Design/Order/OrderItem/Asset/Template).
│   │       ├── fixtures/index.ts   Static fixture object (tenants, users, products, categories,
│   │       │                       designs, addresses). ⚠ Imported by zero spec files.
│   │       ├── helpers/test-utils.ts  createTestingModule(). ⚠ Imported by zero spec files.
│   │       ├── mocks/              prisma.mock, medusa.mock, s3.mock, config.mock, index barrel.
│   │       │                       ⚠ s3.mock.ts is never imported — assets.service.spec.ts
│   │       │                       duplicates the same jest.mock inline at lines 10-26.
│   │       └── unit/               15 spec files mirroring src/ structure.
│   │
│   └── web/                        Next.js 14 frontend. Deployable artifact #2.
│       ├── package.json            6 scripts, 31 runtime deps, 17 dev deps.
│       ├── next.config.js          reactStrictMode true, 2 image remotePatterns.
│       │                           ⚠ No output:"standalone" despite Dockerfile.web needing it.
│       ├── tsconfig.json           5 path aliases. include covers **/*.ts → pulls in jest.config.ts.
│       ├── tailwind.config.ts      158 lines. Full palette, fonts, radii, 6 keyframes, 6 animations.
│       ├── postcss.config.js       tailwindcss + autoprefixer.
│       ├── jest.config.ts          ⚠ BROKEN at line 9 (transform tuple) and line 16
│       │                           (setupFilesAfterFramework is not a Jest option).
│       ├── .env.local              2 public keys (API URL, tenant id).
│       ├── next-env.d.ts           Generated Next type reference.
│       ├── tsconfig.tsbuildinfo    273 KB incremental cache.
│       ├── .turbo/turbo-build.log  Historical: records the removed experimental.serverActions option.
│       ├── public/                 30 files, 5.55 MB.
│       │   ├── favicon.svg         423 B, viewBox 0 0 32 32. Added by BUG #7.
│       │   ├── 3d/                 4 binaries, 5.53 MB — 98 % of all static asset weight.
│       │   │   ├── studio-bg.jpg   1,625,514 B — Babylon full-screen backdrop Layer.
│       │   │   ├── studio.env      273,974 B — prefiltered IBL cube map.
│       │   │   ├── wood-table.jpg  3,416,568 B — table PBR base texture.
│       │   │   └── wood_diff.jpg   215,573 B — ⚠ UNREFERENCED. Dead asset.
│       │   ├── products/  (8 SVG)  viewBox 0 0 400 400. Catalogue thumbnails.
│       │   ├── stock/     (6 SVG)  viewBox 0 0 200 200. Editor stock clip-art.
│       │   └── templates/ (11 SVG) viewBox 0 0 300 400. Template gallery thumbnails.
│       ├── src/
│       │   ├── app/                Next App Router. 14 files.
│       │   │   ├── layout.tsx      Root layout. Metadata, Providers, Sonner Toaster.
│       │   │   ├── page.tsx        Homepage (Server Component). Hardcoded 4-product catalogue.
│       │   │   ├── providers.tsx   QueryClientProvider. ⚠ Zero consumers.
│       │   │   ├── globals.css     74 lines. Google Fonts @import, Tailwind layers,
│       │   │   │                   19 CSS variables, 6 component classes, 1 utility.
│       │   │   ├── (auth)/auth/    Route group. login, register, forgot-password.
│       │   │   ├── (editor)/editor/[productId]/   Route group. The editor shell.
│       │   │   └── (shop)/         Route group. products, products/[id], templates,
│       │   │                       cart, checkout, my-designs.
│       │   ├── components/
│       │   │   ├── editor/         6 components, 100 KB — the largest code cluster in the repo.
│       │   │   │   ├── editor-canvas.tsx        521 lines. Fabric bootstrap, events, shortcuts.
│       │   │   │   ├── editor-left-panel.tsx    672 lines. 7 tab panels in ONE file.
│       │   │   │   ├── editor-right-panel.tsx   954 lines. Property inspector. Largest file.
│       │   │   │   ├── editor-toolbar.tsx       239 lines. Save/undo/zoom/export/cart.
│       │   │   │   ├── editor-3d-preview.tsx    282 lines. Babylon React wrapper + modal.
│       │   │   │   └── print-area-panel.tsx     163 lines. Print-dimension sliders.
│       │   │   ├── layout/         navbar.tsx (138), footer.tsx (61).
│       │   │   └── ui/             button.tsx (62), input.tsx (25), card.tsx (79 — ⚠ 0 imports).
│       │   ├── lib/                8 utility modules — where the editor's real logic lives.
│       │   │   ├── product-3d.ts          679 lines. Babylon scene factory. Isolated.
│       │   │   ├── editor-templates.ts    315 lines. 13 template definitions.
│       │   │   ├── editor-artboard.ts     156 lines. ⚠ Imports the Zustand store (layering violation).
│       │   │   ├── fabric-objects.ts      92 lines. Image loading + origin normalisation.
│       │   │   ├── product-catalog.ts     69 lines. Category resolution + artboard sizes.
│       │   │   ├── product-print-limits.ts 56 lines. Print clamping + mug 3D constants.
│       │   │   ├── canvas-viewport.ts     54 lines. Zoom/pan clamping.
│       │   │   ├── api.ts                 74 lines. Axios instance + 5 API namespaces.
│       │   │   │                          ⚠ Only the raw `api` export is used, by 3 auth pages.
│       │   │   └── utils.ts               7 lines. cn() helper.
│       │   ├── store/              cart-store.ts (71, persisted), editor-store.ts (201, ephemeral).
│       │   └── types/earcut.d.ts   Ambient module declaration for the untyped earcut package.
│       └── tests/unit/             4 spec files. ⚠ None have ever executed.
│           ├── lib/api.spec.ts             Shape-only assertions (toBeDefined).
│           ├── lib/utils.spec.ts           Real assertions on cn().
│           ├── store/cart-store.spec.ts    Real behavioural assertions.
│           └── store/editor-store.spec.ts  ⚠ Asserts zoom clamps of 0.1/5; code clamps 0.25/3.
│
├── packages/
│   └── types/                      Shared type package. ⚠ Zero consumers.
│       ├── package.json            main + types → ./src/index.ts. No deps, no scripts.
│       ├── jest.config.ts          ts-jest. Runs only when invoked directly.
│       ├── src/index.ts            141 lines. 12 interfaces + 1 union type.
│       └── tests/types.spec.ts     17 tests, all passing.
│
├── design-system/
│   └── mylovelygift/MASTER.md      Generated 2026-05-30 by ui-ux-pro-max.
│                                   ⚠ Its palette (#6366F1/#22C55E) contradicts the implemented
│                                   palette (#7C3AED/#06B6D4/#F97316) in tailwind.config.ts.
│
├── docker/
│   ├── Dockerfile.api              2-stage node:20-alpine. ⚠ npm ci needs a lockfile the
│   │                               ./apps/api build context does not contain.
│   └── Dockerfile.web              2-stage, non-root nextjs user, EXPOSE 3000.
│                                   ⚠ Copies .next/standalone which is never produced.
│
└── e2e/
    ├── bug-regression.spec.ts      9 tests, one per QA_AUDIT_REPORT bug.
    │                               ⚠ At least 3 assert strings that no longer exist in the code.
    └── user-journey.spec.ts        100 tests, 18 phases, 44.6 KB.
                                    ⚠ References templates and mock data that were removed.
```

---

## Directories the documentation claims exist but do not

| Claimed path | Claimed at | Reality |
|--------------|-----------|---------|
| `packages/shared/` | `README.md:56`, `.github/copilot-instructions.md:265` | Absent |
| `packages/editor/` | `README.md:57`, `.github/copilot-instructions.md:264` | Absent |
| `apps/api/src/config/` | `.github/copilot-instructions.md:234` | Absent |
| `apps/web/src/app/api/` | `.github/copilot-instructions.md:249` | Absent |
| `apps/web/src/components/shop/` | `.github/copilot-instructions.md:253` | Absent |
| `apps/web/src/components/templates/` | `.github/copilot-instructions.md:254` | Absent |
| `.github/workflows/` | `.github/copilot-instructions.md:1134` | Absent |
| `docs/adr/` | `.github/copilot-instructions.md:900` | Absent (this dossier creates the first `docs/` directory) |
| `docker/volumes/` | `.gitignore:45` | Absent |
| `design-system/pages/` | `design-system/mylovelygift/MASTER.md:3` | Absent — the "page override" mechanism the file describes has no instances |

---

## Deviations from the stated organising convention

| # | Deviation | Location | Why it matters |
|---|-----------|----------|----------------|
| 1 | **`lib/` contains domain logic, not utilities.** `product-3d.ts` (679 lines of 3D scene construction), `editor-templates.ts` (315 lines of design definitions), and `editor-artboard.ts` (artboard geometry) are feature logic living in the "utilities" bucket, while `components/editor/` holds equally feature-specific code. There is no stated rule distinguishing them. | `apps/web/src/lib/` vs `apps/web/src/components/editor/` | A newcomer cannot predict where a given piece of editor behaviour lives |
| 2 | **A `lib/` module imports a React store.** `apps/web/src/lib/editor-artboard.ts:4` does `import { useEditorStore } from "@/store/editor-store"` and calls `useEditorStore.getState()` at lines 92-93 and 105. This makes an apparently pure geometry module depend on global UI state. | `apps/web/src/lib/editor-artboard.ts` | `getArtboardBounds()` accepts a `category` parameter it then discards with `void category` (`editor-artboard.ts:32`) — the signature lies about the dependency |
| 3 | **Seven distinct panel components share one file.** `TemplatesPanel`, `UploadsPanel`, `TextPanel`, `ShapesPanel`, `ImagesPanel`, `BackgroundsPanel`, `LayersPanel` are all defined in `apps/web/src/components/editor/editor-left-panel.tsx` (672 lines). | `apps/web/src/components/editor/editor-left-panel.tsx:96-671` | Contradicts the by-area component convention used everywhere else; blocks code-splitting |
| 4 | **Six distinct components share the right-panel file.** `OpacityControl`, `NumberInput`, `ColorPickerWithSwatches`, `EditorRightPanel`, `TextProperties`, `ShapeProperties`, `ImageProperties` in 954 lines. `NumberInput` and `ColorPickerWithSwatches` are generic primitives that belong in `components/ui/`. | `apps/web/src/components/editor/editor-right-panel.tsx:38-953` | Generic UI primitives are trapped inside a feature file and cannot be reused |
| 5 | **Test location is inconsistent with the project's own standard.** `.github/copilot-instructions.md:745` says tests are "Colocated with source (e.g., `products.service.spec.ts`)". They are not — all API tests live under `apps/api/tests/unit/` mirroring `src/`, and all web tests under `apps/web/tests/unit/`. | `apps/api/tests/`, `apps/web/tests/` | The actual layout is arguably better; the doc is wrong |
| 6 | **Two root-level markdown reports sit outside any docs directory.** `TEST_REPORT.md` and `QA_AUDIT_REPORT.md` are the repository's only bug history, stored as loose root files. | Repo root | Discoverability; also they are the *only* record of nine fixed defects |
| 7 | **14 PNG screenshots at the repository root.** Test artifacts (2.2 MB) mixed with source configuration. | Repo root | Noise; not gitignored |
| 8 | **`packages/types` is a package with no consumers.** It exists to satisfy the monorepo convention but nothing imports `@my-lovely-gift/types`. | `packages/types/` | Types are duplicated in both apps instead |
| 9 | **Route groups are used inconsistently for layout isolation.** `(auth)`, `(shop)`, and `(editor)` exist, but **none of them has a `layout.tsx`**. Every page independently renders `<Navbar />` and `<Footer />`, and `checkout/page.tsx` forgets the `<Footer />` entirely. | `apps/web/src/app/(auth|shop|editor)/` | The route groups provide zero benefit as written; the duplication they were meant to avoid is present anyway |
| 10 | **Root `tsconfig.json` is orphaned.** Neither `apps/web/tsconfig.json` nor `apps/api/tsconfig.json` uses `extends`, so the root config governs nothing except stray root-level `.ts` files (`playwright.config.ts`). | `tsconfig.json:1-18` | Three independently drifting TypeScript configurations |
