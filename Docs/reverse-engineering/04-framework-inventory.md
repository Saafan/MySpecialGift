# 04 — Framework Inventory

[← Index](./00-index.md)

For each framework: the version in use, how deeply the codebase depends on it, how hard it would be to leave, and what the upgrade path looks like.

Legend for **Usage depth**: *Surface* = a handful of call sites, mechanically replaceable · *Structural* = the code's shape follows the framework's conventions · *Load-bearing* = removing it means rewriting a subsystem.

---

## Next.js 14 (App Router)

| | |
|---|---|
| **Version** | `^14.2.0` declared (`apps/web/package.json:36`); `14.2.35` observed in build (`apps/web/.turbo/turbo-build.log:9`) |
| **Usage depth** | **Structural** |
| **Coupling** | High. All 14 route files live under `apps/web/src/app/` and rely on App Router conventions: route groups `(auth)`, `(shop)`, `(editor)`; dynamic segments `[id]`, `[productId]`; the `metadata` export (`apps/web/src/app/layout.tsx:6-13`); `"use client"` boundaries (10 files). Navigation uses `next/link` and `next/navigation` hooks (`useRouter`, `useSearchParams`, `useParams`) in 9 files. |
| **Lock-in** | **Medium-high.** The routing model, the server/client component split, and image handling (`apps/web/next.config.js:4-15`) would all need reworking. However, only 4 of 14 route files are actually Server Components (`apps/web/src/app/page.tsx`, `layout.tsx`, `(shop)/templates/page.tsx`, plus the layout's `Footer`/`Navbar` split), so the RSC dependency is shallower than typical. |
| **Upgrade path to 15** | Next 15 makes `params` and `searchParams` async in server components. Two files destructure `params` synchronously in a **client** component — `apps/web/src/app/(shop)/products/[id]/page.tsx:168` and `apps/web/src/app/(editor)/editor/[productId]/page.tsx:14` — which is the pattern Next 15 changed. Both would need `React.use()` or a `useParams()` rewrite. |
| **Known local friction** | `apps/web/.turbo/turbo-build.log:5-8` records `⚠ Invalid next.config.js options detected: Expected object, received boolean at "experimental.serverActions"` — evidence the config once carried a stale Next 13 option that has since been removed from `apps/web/next.config.js`. |
| **Unused capability** | No `next/dynamic`, no `React.lazy`, no `Suspense`, no `loading.tsx`, no `error.tsx`, no `not-found.tsx`, no `route.ts` handlers, no middleware, no `generateStaticParams`, no `next/image` (all images are raw `<img>`). |

---

## React 18

| | |
|---|---|
| **Version** | `^18.3.0` (`apps/web/package.json:37-38`) |
| **Usage depth** | **Load-bearing** |
| **Coupling** | Total. Every UI file. |
| **StrictMode** | Enabled via `apps/web/next.config.js:3` (`reactStrictMode: true`). This is **load-bearing knowledge**: the 60 ms deferred-creation timer at `apps/web/src/components/editor/editor-3d-preview.tsx:55-65` exists *because* StrictMode double-invokes effects and building two Babylon engines on one canvas corrupted the IBL shader compile. |
| **Hooks used** | `useState`, `useEffect`, `useRef`, `useCallback`, `forwardRef`. **Not used:** `useMemo`, `useReducer`, `useContext` (custom), `useTransition`, `useDeferredValue`, `useId`, `useSyncExternalStore` (directly). |
| **Anti-pattern present** | Two components force re-renders with a counter instead of deriving state: `apps/web/src/components/editor/editor-right-panel.tsx:206` and `apps/web/src/components/editor/editor-left-panel.tsx:590` (`const [, forceUpdate] = useState(0)`). This is the residue of BUG-P01 (see [13](./13-historical-bug-report.md#bug-p01)). |
| **Lock-in** | Absolute, and appropriate. |

---

## Fabric.js 6

| | |
|---|---|
| **Version** | `^6.0.0` (`apps/web/package.json:33`) |
| **Usage depth** | **Load-bearing** — it *is* the editor |
| **Coupling** | Very high, across 7 files: `apps/web/src/components/editor/editor-canvas.tsx`, `editor-left-panel.tsx`, `editor-right-panel.tsx`, and `apps/web/src/lib/{editor-artboard,editor-templates,fabric-objects,canvas-viewport}.ts`. The persisted design format **is** Fabric's `toJSON()` output — stored in `localStorage` (`apps/web/src/components/editor/editor-toolbar.tsx:66,71`), in the undo stack (`apps/web/src/store/editor-store.ts:25-26`), in cart items (`apps/web/src/store/cart-store.ts:9`), and in the DB column `designs.canvasData` (`apps/api/prisma/schema.prisma:191`). |
| **v6-specific APIs in use** | Promise-returning `canvas.loadFromJSON(...).then()` (`apps/web/src/store/editor-store.ts:159,183`; `apps/web/src/components/editor/editor-canvas.tsx:327`), promise-returning `object.clone().then()` (`apps/web/src/components/editor/editor-canvas.tsx:456`; `editor-right-panel.tsx:245`), `canvas.sendObjectToBack` / `bringObjectForward` / `sendObjectBackwards` (`apps/web/src/lib/editor-artboard.ts:137`; `editor-right-panel.tsx:267,274`), `canvas.setDimensions`, `FabricObject.customProperties` (`apps/web/src/components/editor/editor-canvas.tsx:29`), dynamic `import("fabric").then(({ filters }) => …)` (`editor-right-panel.tsx:908`). All are v6 signatures; **none of this works on Fabric v5**. |
| **Lock-in** | **Very high and data-level.** Migrating away from Fabric would invalidate every saved design in every user's `localStorage` and every `canvasData` row. A migration would need a Fabric-JSON → new-format converter. |
| **Upgrade risk** | A Fabric minor bump can silently change serialisation. `FabricObject.customProperties = ["id", "selectable", "evented"]` is a global static mutation (`apps/web/src/components/editor/editor-canvas.tsx:29`) that a future Fabric version could rename or remove — and if it does, the artboard becomes draggable again (BUG-E-ARTBOARD, see [13](./13-historical-bug-report.md)). |

---

## Babylon.js 7

| | |
|---|---|
| **Version** | `^7.54.3` (`apps/web/package.json:14`) |
| **Usage depth** | **Load-bearing**, but **perfectly isolated** |
| **Coupling** | Confined to exactly **one file**: `apps/web/src/lib/product-3d.ts`. It exposes a framework-agnostic handle interface — `{ setDesignDataUrl, requestRender, resize, dispose }` (`apps/web/src/lib/product-3d.ts:38-43`) — consumed by a single React wrapper (`apps/web/src/components/editor/editor-3d-preview.tsx:35-82`). This is the cleanest boundary in the entire repository. |
| **Import style** | 24 deep-path imports (`@babylonjs/core/Engines/engine`, `.../Maths/math`, etc.) plus 5 side-effect imports for scene components (`apps/web/src/lib/product-3d.ts:20-24`). This is the tree-shaking-friendly form and materially reduces bundle size versus `import * from "@babylonjs/core"`. |
| **Lock-in** | **Low at the code level, high at the tuning level.** Swapping to Three.js means reimplementing `createProductScene`, but nothing else changes. However, the *geometry constants* are hand-tuned and cross-coupled to the 2D artboard: `apps/web/src/lib/product-3d.ts:167-177` documents that the mug's wrap-band aspect ratio (≈2.934) must equal `ARTBOARD_SIZES.cup` = `{ width: 1115, height: 380 }` (`apps/web/src/lib/product-catalog.ts:20`), and `MUG_3D_PRINT` (`apps/web/src/lib/product-print-limits.ts:9-13`) is declared as "must stay in sync with `buildMug`". Losing that knowledge would produce visibly stretched artwork. |
| **Runtime assets required** | `/3d/studio-bg.jpg` (1,625,514 B), `/3d/studio.env` (273,974 B IBL cube map), `/3d/wood-table.jpg` (3,416,568 B). Referenced at `apps/web/src/lib/product-3d.ts:457,465,508`. |

---

## Zustand 4

| | |
|---|---|
| **Version** | `^4.5.0` (`apps/web/package.json:44`) |
| **Usage depth** | **Structural** |
| **Coupling** | Two stores: `apps/web/src/store/cart-store.ts` (with `persist` middleware, `cart-store.ts:29,66-68`) and `apps/web/src/store/editor-store.ts` (no middleware). Consumed by 9 components. Also used *outside* React via `useEditorStore.getState()` in 5 files — notably `apps/web/src/lib/editor-artboard.ts:4,92-93,105` imports the store into a pure-utility module, which is a layering violation (see [07](./07-architecture.md#architectural-inconsistencies)). |
| **Zustand-4-specific API** | `useEditorStore.subscribe((state, prevState) => …)` with two arguments (`apps/web/src/components/editor/editor-canvas.tsx:393`). In Zustand v5 the plain `subscribe` still provides `prevState`, so this survives; but `create<T>()(…)` curried form (`cart-store.ts:28`) and the `persist` import path are v4/v5-compatible. |
| **Lock-in** | **Low.** Both stores are small (71 and 201 lines) and could be ported to Redux Toolkit, Jotai, or plain context in a day. The `persist` key `"cart-storage"` (`apps/web/src/store/cart-store.ts:66`) is user data and would need a migration shim. |

---

## NestJS 10

| | |
|---|---|
| **Version** | `^10.3.0` core (`apps/api/package.json:24,27-28`) |
| **Usage depth** | **Structural** |
| **Coupling** | High but conventional. 6 feature modules + 2 global common modules, all following `module` / `controller` / `service` triples. Decorator-driven: `@Module`, `@Controller`, `@Injectable`, `@Global`, `@Get/@Post/@Put/@Delete`, `@Body/@Query/@Param/@Headers`, `@ApiTags/@ApiOperation`. Lifecycle hooks used in `apps/api/src/common/prisma/prisma.service.ts:9-15` (`OnModuleInit`/`OnModuleDestroy`). |
| **Unused Nest capability** | No guards, no interceptors, no exception filters, no custom decorators, no middleware, no pipes beyond the one global `ValidationPipe`, no DTO classes, no `CacheModule`, no `BullModule`, no microservices, no WebSocket gateways, no `@nestjs/terminus` health checks. |
| **Lock-in** | **Medium.** The services are plain classes with constructor injection and no Nest-specific logic inside them — `apps/api/src/modules/products/products.service.ts` would run unchanged under Fastify, Express, or plain Node. The controllers are thin. A framework swap is mostly mechanical. |
| **Upgrade path to Nest 11** | Requires Express 5 / updated `@nestjs/platform-express`. The only Express-specific code is `helmet()` and `compression()` at `apps/api/src/main.ts:12-13`, both of which have Express-5-compatible releases. Low risk. |

---

## Prisma 5

| | |
|---|---|
| **Version** | `^5.17.0` client and CLI (`apps/api/package.json:30,54`) |
| **Usage depth** | **Load-bearing** |
| **Coupling** | Total for data access. `PrismaService extends PrismaClient` (`apps/api/src/common/prisma/prisma.service.ts:5-6`), registered globally (`apps/api/src/common/prisma/prisma.module.ts:4-9`), injected into all 5 data services. `apps/api/src/modules/products/products.service.ts:3,16,78,85` imports the generated `Prisma` namespace types directly into service signatures — the tightest coupling point in the backend. |
| **Lock-in** | **High.** The schema (`apps/api/prisma/schema.prisma`, 282 lines, 12 models, 6 enums) is the single source of truth for the database, and the migration SQL is generated from it. Leaving Prisma means hand-writing the schema and re-deriving all types. |
| **Fragility** | Generated-client drift is a proven failure mode here — `apps/api/.turbo/turbo-build.log:12-23` captures three `TS2694` errors where `Prisma.ProductWhereInput`, `ProductCreateInput`, and `ProductUpdateInput` "had no exported member" because the client was stale. |
| **Upgrade path to Prisma 6** | Prisma 6 changes the default generator output location (`generator client` gains an `output` requirement in later versions) and drops Node < 18.18. `apps/api/prisma/schema.prisma:1-3` uses the bare `provider = "prisma-client-js"` with no `output`, so it would need updating. Low-to-medium risk. |

---

## Tailwind CSS 3

| | |
|---|---|
| **Version** | `^3.4.0` (`apps/web/package.json:61`) |
| **Usage depth** | **Load-bearing for presentation** |
| **Coupling** | Total. There is **no CSS Modules, no styled-components, no emotion, no vanilla-extract**. Every visual style is either a Tailwind utility inline in JSX or one of six `@layer components` classes in `apps/web/src/app/globals.css:45-64` (`.btn-gradient`, `.card-fun`, `.glass-card`, `.gradient-text`, `.sidebar-item`, `.sidebar-item-active`). |
| **Config surface** | `apps/web/tailwind.config.ts` — 158 lines defining a full colour scale, 3 font families, radius tokens bound to `--radius`, 6 keyframes, 6 animations, and the `tailwindcss-animate` plugin. Content glob is `./src/**/*.{ts,tsx}` (`apps/web/tailwind.config.ts:5-7`). |
| **Dark mode** | Configured as `darkMode: ["class"]` (`apps/web/tailwind.config.ts:4`) but **no `.dark` variant is ever defined** in `globals.css` and **no element ever receives the `dark` class**. Dark mode is declared and non-functional. |
| **Lock-in** | **Very high.** Every one of the ~22 `.tsx` files carries utility strings. Migrating off Tailwind is a full restyle. |
| **Upgrade path to Tailwind 4** | v4 replaces the JS config with CSS-first `@theme`. This config uses `require("tailwindcss-animate")` (`apps/web/tailwind.config.ts:155`) and a large `theme.extend.colors` object — both need rewriting. Medium effort, contained to two files. |

---

## TanStack React Query 5

| | |
|---|---|
| **Version** | `^5.50.0` (`apps/web/package.json:27`) |
| **Usage depth** | **Surface — effectively zero** |
| **Coupling** | A `QueryClientProvider` wraps the app (`apps/web/src/app/providers.tsx:19-21`) with `staleTime: 60_000` and `refetchOnWindowFocus: false` (`providers.tsx:12-14`). **No `useQuery`, `useMutation`, `useInfiniteQuery`, or `queryClient` call exists anywhere in `apps/web/src`.** |
| **Lock-in** | **None.** Deleting the dependency and `providers.tsx` would change nothing observable. |
| **Note** | `.github/copilot-instructions.md:394-406` prescribes a `useQuery`-based API pattern that no file follows. |

---

## Radix UI

| | |
|---|---|
| **Versions** | 10 packages, `^1.1.0`–`^2.1.0` (`apps/web/package.json:17-26`) |
| **Usage depth** | **Surface** |
| **Coupling** | Exactly one import: `Slot` from `@radix-ui/react-slot` in `apps/web/src/components/ui/button.tsx:2`, used for the `asChild` prop (`button.tsx:44,49`). Even that prop is never used by any caller. |
| **Unused packages** | `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-scroll-area`, `react-select`, `react-separator`, `react-slider`, `react-tabs`, `react-tooltip` — all nine have zero imports. |
| **Consequence** | Every dialog, dropdown, and tab in the app is hand-rolled with raw `<div>`/`<button>` and conditional rendering — the 3D modal (`apps/web/src/components/editor/editor-3d-preview.tsx:213-278`), the filters popover (`apps/web/src/app/(shop)/products/page.tsx:135-197`), the design card menu (`apps/web/src/app/(shop)/my-designs/page.tsx:151-164`), and the left-panel tabs (`apps/web/src/components/editor/editor-left-panel.tsx:45-63`). None have focus traps, `role`/`aria-*` wiring, or Escape handling. See [17](./17-accessibility-findings.md). |
| **Lock-in** | **None.** |

---

## MedusaJS

| | |
|---|---|
| **Versions** | `@medusajs/medusa ^1.20.0`, `@medusajs/medusa-js ^6.1.0` (`apps/api/package.json:21-22`); `@medusajs/medusa-js ^6.1.0` also in `apps/web/package.json:16` |
| **Usage depth** | **Surface, and dead** |
| **Coupling** | `MedusaService` constructs a client with `maxRetries: 3` (`apps/api/src/common/medusa/medusa.service.ts:10-13`) and exposes six wrappers: `getClient`, `getProducts`, `getProduct`, `createCart`, `addToCart`, `completeCart` (`medusa.service.ts:16-46`). It is registered globally (`apps/api/src/common/medusa/medusa.module.ts:4-9`) and injected into `OrdersService` (`apps/api/src/modules/orders/orders.service.ts:9`). **`OrdersService` never calls it.** No controller route reaches any Medusa method. |
| **In the frontend** | `@medusajs/medusa-js` has **zero imports** in `apps/web/src`. |
| **Infrastructure** | The `medusa` Compose service uses image `node:20-alpine` with **no build, no volume mount, and no command** (`docker-compose.yml:53-71`), so it cannot actually run Medusa — it would start a bare Node container and exit. |
| **Lock-in** | **None today.** The abstraction exists but carries no traffic. |
| **Schema hooks left behind** | `medusaId` columns on `users`, `products`, `product_variants`, and `medusaOrderId` on `orders` (`apps/api/prisma/schema.prisma:36,64,95,220`), all `String?` and all unique. These are the integration seams for a future wiring-up; nothing writes them today. |

---

## Jest 29

| | |
|---|---|
| **Version** | `^29.7.0` in all three workspaces |
| **Usage depth** | **Structural** for the API |
| **Transformers** | API: `ts-jest ^29.4.11` with `tsconfig.json` (`apps/api/jest.config.ts:9-12`). Web: `@swc/jest ^0.2.0` (`apps/web/jest.config.ts:7`) — **misconfigured**. Types: `ts-jest` (`packages/types/jest.config.ts:6-8`). |
| **Path mapping** | API maps `@/*` → `src/*` and `@test/*` → `tests/*` (`apps/api/jest.config.ts:16-19`), matching `apps/api/tsconfig.json:19-22`. Web maps five aliases (`apps/web/jest.config.ts:9-15`). |
| **Coverage config** | API collects from `src/**/*.(t|j)s` excluding `main.ts` (`apps/api/jest.config.ts:13`). Web excludes `layout.tsx`, `providers.tsx`, `*.d.ts` (`apps/web/jest.config.ts:17-22`). **Neither sets a `coverageThreshold`**, so coverage is measured but never enforced. |
| **Lock-in** | Low. |

---

## Playwright

| | |
|---|---|
| **Version** | `@playwright/test ^1.60.0`, `@playwright/cli ^0.1.13` (`package.json:27-28`) |
| **Usage depth** | **Surface** |
| **Config** | `playwright.config.ts` — `testDir: "./e2e"`, `fullyParallel: false`, `workers: 1`, `reporter: "html"`, `trace: "on-first-retry"`, `screenshot: "only-on-failure"`, one Chromium project, `retries: 2` under CI. |
| **Blocking defect** | `baseURL` and `webServer.url` are both `http://localhost:3001` (`playwright.config.ts:12,23`) while `webServer.command` is `npm run dev:web` → `next dev` → **port 3000**. With `reuseExistingServer: true` (`playwright.config.ts:24`) and a 30 s timeout, the suite will hang and then fail unless something unrelated is already listening on 3001. |
| **Lock-in** | None. |

---

## Summary: what you are actually locked into

| Framework | Lock-in | Reason |
|-----------|---------|--------|
| Fabric.js 6 | **Highest** | Its JSON is the persisted data format in three places |
| Tailwind 3 | **Very high** | Every component's presentation |
| React 18 / Next 14 | **High** | The entire frontend shape |
| Prisma 5 | **High** | Schema + migrations + generated types in service signatures |
| Babylon.js 7 | **Medium** | Isolated behind one interface, but the tuning constants are irreplaceable knowledge |
| NestJS 10 | **Medium** | Conventional; services are portable |
| Zustand 4 | **Low** | Two small stores |
| Jest / Playwright | **Low** | Standard |
| Radix, React Query, Medusa, framer-motion, react-hook-form, zod, date-fns | **None** | Effectively unused |
