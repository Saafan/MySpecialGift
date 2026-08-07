# 18 — Performance Findings

[← Index](./00-index.md)

**Method.** Static analysis plus byte-level measurement of assets. `[UNVERIFIED: all runtime timings, FPS, Core Web Vitals, and bundle-analyser output — I did not run the application or a production build. Every cost below is either a measured byte count or a structural estimate, and is labelled as such.]`

---

## Measured facts

| Metric | Value | Source |
|--------|------:|--------|
| `apps/web/public` total | **5,553,777 B** | Filesystem |
| `apps/web/public/3d` total | **5,531,629 B (99.6 %)** | Filesystem |
| — `wood-table.jpg` | 3,416,568 B | `product-3d.ts:508` |
| — `studio-bg.jpg` | 1,625,514 B | `product-3d.ts:457` |
| — `studio.env` (IBL cube map) | 273,974 B | `product-3d.ts:465` |
| — `wood_diff.jpg` | 215,573 B | **Referenced nowhere — dead** |
| All 26 SVGs combined | 22,148 B | Filesystem |
| Existing `.next` build output | 133,403,561 B / 547 files | Filesystem (dev + prod artifacts, not a clean prod build) |
| `apps/api/dist` | 1,102,103 B / 145 files | Filesystem |
| API test suite wall time | **52.2 s** for 146 tests | Measured (`npx jest --ci`) |
| Slowest API suite | 49.0 s (`assets.controller.spec.ts`) | Measured |

---

## 🔴 Critical

### PERF-01 — 5.3 MB of 3D assets load eagerly, unoptimised, on every editor mount

**Evidence.** `apps/web/src/lib/product-3d.ts:457,465,508` construct a `Layer`, a `CubeTexture`, and a `Texture` from three files totalling **5,316,056 bytes**. These are fetched by Babylon's own loaders, so they bypass `next/image` entirely — no WebP/AVIF conversion, no responsive sizes, no automatic compression, no `priority`/`loading` control.

**Compounding factors.**
- `wood-table.jpg` (3.42 MB) is a texture for a **decorative table surface** that occupies a fraction of the frame, applied to a 9-unit-diameter cylinder with `uScale/vScale = 1.3` (`product-3d.ts:509-510`).
- `studio-bg.jpg` (1.63 MB) is a full-screen backdrop `Layer` (`:457`).
- The scene is created for the **thumbnail**, which renders at **144 × 144 CSS pixels** (`editor-3d-preview.tsx:184`, `w-36 h-36`). Over 5 MB of texture data is downloaded to fill a 144 px square.
- The scene **rebuilds from scratch** whenever `category`, `tier`, `interactive`, or `autoRotate` changes (`editor-3d-preview.tsx:74`). Opening the modal changes `interactive` from `false` to `true` — **a full teardown and rebuild, re-decoding all three textures.**

**Estimated cost.** `[ESTIMATE]` On a 10 Mbps connection, ~4.3 s of transfer before the first 3D frame; on 3G, well over 30 s. Decode and GPU upload add hundreds of milliseconds even on desktop.

**Remediation.** Convert to WebP/AVIF or KTX2/Basis (typically 70–90 % smaller for textures); generate a small thumbnail-tier variant; lazy-load the modal-quality assets only on expand; delete `wood_diff.jpg`.

---

### PERF-02 — No code splitting anywhere; the editor ships to every visitor

**Evidence.** Zero occurrences of `next/dynamic`, `React.lazy`, or `Suspense` in `apps/web/src`. `.github/copilot-instructions.md:927-928` prescribes both and neither exists.

Consequence: `@babylonjs/core` and `fabric` are in the same module graph as the homepage. Next.js route-level splitting helps — `/editor/[productId]` is its own chunk — but:
- `editor-3d-preview.tsx:11` statically imports `product-3d.ts`, which statically imports 24 Babylon modules (`product-3d.ts:1-24`) plus `earcut`. **The 3D engine is in the editor's initial chunk, not deferred.** A user who never expands the preview still downloads and parses it.
- `editor-canvas.tsx:4` statically imports six Fabric symbols; five more files import Fabric statically.

**The one place dynamic import *is* used** is `editor-right-panel.tsx:908` — `import("fabric").then(({ filters }) => …)` — which defers only the filters module, the smallest possible win.

`[UNVERIFIED: exact chunk sizes — no bundle analyser output exists and I did not run `next build`. Structurally, Babylon core with 24 deep imports plus Fabric 6 is a large payload.]`

**Remediation.** `const Editor3DPreview = dynamic(() => import(".../editor-3d-preview"), { ssr: false })`; do the same for `EditorCanvas`; consider deferring the Babylon scene factory behind a user gesture.

---

### PERF-03 — Every canvas event re-renders a 954-line component tree

**Evidence.** `apps/web/src/components/editor/editor-right-panel.tsx:206,215-234` subscribes `forceUpdate` to seven Fabric events, including `object:moving`, `object:scaling`, and `object:rotating` — which fire on **every animation frame** during a drag.

Each increment re-renders `EditorRightPanel` and, transitively, `PrintAreaPanel`, `TextProperties`/`ShapeProperties`/`ImageProperties`, up to five `NumberInput`s, one to three `ColorPickerWithSwatches` (each mapping 15 swatch buttons), and `OpacityControl`.

`editor-left-panel.tsx:590,593-604` does the same for `LayersPanel` on `object:added`/`removed`/`modified`.

**No memoisation exists anywhere in the frontend** — zero occurrences of `React.memo`, `useMemo`, or `useCallback` on any render-path value. (`useCallback` is used four times, all for stable *effect* dependencies, not to prevent re-renders: `editor-canvas.tsx:55,61,96`; `editor-3d-preview.tsx:121,151`; `print-area-panel.tsx:33`.)

**Estimated cost.** `[ESTIMATE]` Dragging a shape for one second at 60 fps triggers ~60 full re-renders of a subtree containing ~50 elements — roughly 3,000 element reconciliations per second of drag, on the same main thread that Fabric is using to render the canvas.

**Why it cannot simply be removed.** This is BUG-P01's fix. See [13, D-6/D-10](./13-historical-bug-report.md#defensive-code-inventory). The correct remediation is structural, not deletion.

**Remediation.** Subscribe with `useSyncExternalStore` and a selector so only the components whose values changed re-render; or throttle the `object:moving`/`scaling`/`rotating` handlers to ~16 ms; or split each property section into its own memoised component with a narrow subscription.

---

## 🟠 High

### PERF-04 — Full-canvas JSON serialisation on every mutation

`JSON.stringify(canvas.toJSON())` runs at **15 call sites** (listed in [10](./10-state-management.md#pushundo-call-site-inventory)), including `object:modified` (`editor-canvas.tsx:264`), which fires on every drag-end, resize-end, and rotate-end.

For a design containing an uploaded image, `toJSON()` embeds the **full base64 data URL**. A 5 MB JPEG becomes ~6.7 MB of base64, serialised **on every single mutation** and pushed onto a 50-entry stack.

**Worst case:** 50 × 6.7 MB = **335 MB of strings held in memory** by the undo stack alone. This is a realistic out-of-memory path, not a theoretical one.

**Remediation.** Store deltas or object-level patches instead of full snapshots; strip image `src` from history entries and hold them in a side table keyed by object id; hard-cap the total byte size of the stack.

### PERF-05 — Design capture rasterises the entire canvas at up to 2× on every edit

`editor-3d-preview.tsx:121-149` → `exportArtboardDataUrl` → `canvas.toDataURL({ multiplier })`.

Multiplier is `clamp(1280 / longEdge, 0.75, 2)` (`:131-135`). For the cup artboard on a typical 1200 px-wide editor, `longEdge ≈ 1115` → multiplier 1.148 → a ~1280 × 436 rasterisation, base64-encoded, on **every** `object:added` / `object:modified` / `object:removed`, debounced to 400 ms.

Then Babylon disposes the previous `Texture` and creates a new one from the data URL (`product-3d.ts:570-601`) — a fresh decode and GPU upload per capture.

**Mitigations already present:** the 400 ms debounce (`:84,153`), the `capturePendingRef` mutex (`:114,123-124`), and `requestAnimationFrame` scheduling (`:127`). These are good. The remaining cost is inherent to the approach.

**Remediation.** Render the Fabric canvas directly into a `WebGLTexture` via `DynamicTexture` and the canvas element, avoiding the base64 round trip entirely.

### PERF-06 — 16 always-running blurred animations

`animate-float` with `blur-3xl` on elements up to 384 px square, at:
`page.tsx:73,74,75` · `products/page.tsx:233,234` · `products/[id]/page.tsx:197,198` · `login/page.tsx:46,47,48` · `register/page.tsx:58,59` · `forgot-password/page.tsx:36,37`

`blur-3xl` is `filter: blur(64px)`. Combined with an infinite `transform: translateY` animation, each element forces a **composited layer with a 64 px blur re-evaluated every frame**, forever, whether or not the user is interacting.

There is no `prefers-reduced-motion` escape (see [17, A11Y-12](./17-accessibility-findings.md)), no `will-change` hint, and no intersection-observer pause.

**Estimated cost.** `[ESTIMATE]` On integrated graphics, three simultaneous 384 px 64 px-blur layers animating at 60 fps is a measurable continuous GPU load — the classic cause of laptop fan spin-up on an idle marketing page.

**Remediation.** Replace with a static blurred background image, or gate behind `prefers-reduced-motion: no-preference` and `IntersectionObserver`.

### PERF-07 — Render-blocking third-party font import

`apps/web/src/app/globals.css:1` — a `@import url(...)` at the very top of the only stylesheet. CSS `@import` is **serially render-blocking**: the browser must fetch `globals.css`, parse line 1, then fetch `fonts.googleapis.com/css2?...`, then fetch the actual WOFF2 files from `fonts.gstatic.com` — three round trips to two extra origins before first paint.

Sixteen font faces are requested (Rubik 300–900 = 7 weights, Nunito Sans 300–800 = 6 weights, plus italic variants implied by the family).

`next/font/google` is available in Next 14 and would self-host, subset, preload, and eliminate both extra origins. It is not used.

### PERF-08 — Four unpaginated API endpoints

| Endpoint | Service | Bound |
|----------|---------|-------|
| `GET /designs` | `designs.service.ts:9-12` | **None** |
| `GET /orders` | `orders.service.ts:13-17` | **None** — plus `include: { items: true }` |
| `GET /templates/categories` | `templates.service.ts:9-12` | **None** |
| `GET /templates/categories/:slug` nested templates | `templates.service.ts:18-23` | **None** |

`GET /designs` returns every design a user owns, each carrying a full `canvasData` JSON blob. A power user with 500 designs receives a multi-megabyte response.

`GET /products` *is* paginated but has **no maximum** — `take: params?.limit || 20` (`products.service.ts:40`) accepts `?limit=999999`, contradicting `.github/copilot-instructions.md:603`.

### PERF-09 — Over-fetching on the product endpoints

`ProductsService.findOne` (`:50-62`) and `findBySlug` (`:64-76`) eagerly include `category`, `variants`, `images`, **and** `designTemplates: { include: { template: true } }` — where each `template` carries a full `canvasData` JSON. A product with 20 associated templates returns 20 complete canvas documents to render a detail page that needs only names and thumbnails.

`findAll` is better — it includes `category`, `variants`, and `images` but **not** `designTemplates` (`:35-39`).

**N+1 query audit:** ✅ **No N+1 pattern exists.** Every relation is loaded with Prisma `include` in a single query, and `findAll` uses `Promise.all([findMany, count])` (`:32-45`) rather than sequential awaits. This is correct.

**Missing indexes:** the migration creates 10 indexes (`migration.sql:211-238`), all unique constraints or FKs. There is **no index on** `products.status` (filtered on every list query, `products.service.ts:18`), `products.categoryId`, `designs.userId` (the primary access path, `designs.service.ts:10`), `orders.userId`, `order_items.orderId`, `design_templates.categoryId`, or `design_templates.visibility`. Postgres does **not** auto-index foreign keys. `.github/copilot-instructions.md:527-529` requires indexes on all FKs and on `status`. At current data volumes this is invisible; it becomes a sequential-scan problem the moment the tables grow.

---

## 🟡 Medium

### PERF-10 — Derived values recomputed on every render

- `cart/page.tsx` calls `totalPrice()` **five times** in one render (lines 134, 140, 146, 154, 155) and `items.length` twice. Each `totalPrice()` is a full `reduce` over the cart (`cart-store.ts:62-63`).
- `checkout/page.tsx:61-64` calls `totalPrice()` once and derives correctly ✅ — the better pattern, in the same codebase.
- `navbar.tsx:83,87` calls `totalItems()` twice per render.
- `products/page.tsx:71-103` re-runs the whole filter+sort IIFE on every render, including every keystroke of the price slider.
- `editor-right-panel.tsx:236` calls `canvas.getActiveObject()` on every render, and every `forceUpdate` triggers a render.
- `editor-left-panel.tsx:606-607` calls `canvas.getObjects().filter(...)` on every render of `LayersPanel`.

None of these is expensive at current scale; all of them are unmemoised patterns that scale badly.

### PERF-11 — `<img>` everywhere instead of `next/image`

**Fifteen raw `<img>` tags**, none using Next's image pipeline:
`page.tsx:180` · `products/page.tsx:227` · `products/[id]/page.tsx:191` · `templates/page.tsx:128` · `cart/page.tsx:74` · `editor-left-panel.tsx:149,230,471`

Consequences: no automatic WebP/AVIF, no responsive `srcset`, no lazy loading, no blur placeholder, no layout-shift prevention (`width`/`height` are never specified — every one relies on CSS `aspect-*` containers, which does prevent CLS ✅ but only by accident of the layout).

Mitigating: the product/stock/template images are all SVGs (22 KB total), so the optimisation upside is small. The cart thumbnail (`cart/page.tsx:74`) is a base64 PNG data URL, which `next/image` cannot optimise anyway.

`apps/web/next.config.js:4-15` configures `images.remotePatterns` for `**.amazonaws.com` and `localhost` — **infrastructure for a `next/image` usage that does not exist.**

### PERF-12 — Startup / cold-boot sequence has three artificial delays

| Delay | Location | Purpose |
|-------|----------|---------|
| 100 ms | `editor-canvas.tsx:145` | Wait for layout before creating Fabric (D-16) |
| 60 ms | `editor-3d-preview.tsx:65` | Avoid the StrictMode double-mount (D-2) |
| 400 ms | `editor-3d-preview.tsx:84,153` | Debounce the design capture |

**Cumulative time-to-first-3D-frame:** 100 ms (canvas) + 60 ms (Babylon defer) + engine construction + 5.3 MB of texture download and decode + `executeWhenReady` + 3 frames. `[ESTIMATE: 1–5 s on a warm cache and a fast machine; substantially longer on a cold cache.]`

The 100 ms canvas delay is a **hard floor on editor interactivity** — no design work is possible before it elapses, even on an instant load.

**Remediation.** Replace the 100 ms timer with a `ResizeObserver` that fires as soon as the container has non-zero dimensions (the observer is already created 170 lines later at `:318`).

### PERF-13 — Synchronous `scryptSync` blocks the API event loop

`apps/api/src/modules/auth/auth.service.ts:29,37`. Node's default scrypt parameters (N=16384, r=8, p=1) take tens of milliseconds. Both `hashPassword` and `verifyPassword` are synchronous, so **every login and registration blocks the single-threaded event loop for the full duration**, stalling all concurrent requests.

Combined with the absence of rate limiting ([16, SEC-07](./16-security-findings.md)), this is a denial-of-service vector as well as a throughput ceiling.

**Remediation.** Use the callback/promise form of `crypto.scrypt`.

### PERF-14 — `objectCaching: false` on all images

`fabric-objects.ts:82`. Disabling Fabric's per-object bitmap cache forces a full re-draw of the image on every canvas render — including during pans, zooms, and every one of the 60-per-second renders during a drag of *any other* object.

This is defensive code (D-41) preventing stale bitmaps after filter changes. The targeted fix would be `obj.dirty = true` on filter application (which `ShapeProperties` already does at `editor-right-panel.tsx:800,811,824,836`) rather than disabling caching permanently.

### PERF-15 — The undo stack holds 50 full serialisations

`editor-store.ts:133` — `undoStack: [...current.undoStack.slice(-49), state]`. Each entry is a complete canvas JSON string. See PERF-04 for the memory implication.

### PERF-16 — `localStorage` writes are synchronous and unbatched

Every Save (`editor-toolbar.tsx:71`) writes the full design JSON synchronously on the main thread. Every `setPrintDimensions` with a persist key writes (`editor-store.ts:126`). Zustand's `persist` writes the whole cart on every mutation (`cart-store.ts:66-68`).

Slider drags on the print-area panel call `applyDimensions` on **every input event** (`print-area-panel.tsx:89-93,124-128`), each producing a `localStorage.setItem`. Dragging the width slider across its range fires hundreds of synchronous storage writes.

### PERF-17 — API test suite takes 52 seconds for 146 unit tests

Measured. Individual suites take 39–49 s wall time each while running in parallel — the dominant cost is `ts-jest` compiling the NestJS decorator metadata for each isolated worker, not the assertions.

Jest also reports: *"A worker process has failed to exit gracefully and has been force exited… tests leaking due to improper teardown."* No spec calls `app.close()` or `module.close()` on the `TestingModule` it creates — 15 modules are compiled and never closed.

**Remediation.** `@swc/jest` instead of `ts-jest` (already a dependency in the web workspace); add `afterEach(() => module.close())`.

---

## 🟢 Low

### PERF-18 — Dead weight
- `wood_diff.jpg` — **215,573 B** shipped in `public/` and referenced by nothing.
- 21 declared-but-unimported npm packages (see [05](./05-dependency-analysis.md#declared-but-imported-nowhere-candidate-removals)) — install-time and `node_modules` cost only, since unimported packages are tree-shaken out of the bundle. `sharp` and `@medusajs/medusa` are the heaviest.
- `apps/web/src/components/ui/card.tsx` (78 lines) — dead file, tree-shaken.
- `packages/types` (141 lines) — no consumers.

### PERF-19 — `transition-all` used ~30 times
`transition-all` animates every animatable property including `box-shadow`, `filter`, and `transform`. `globals.css:47,50,53,59` and ~26 component sites. Transitioning specific properties is measurably cheaper.

### PERF-20 — Redis and Bull are installed and unregistered
`@nestjs/cache-manager`, `cache-manager`, `cache-manager-redis-yet`, `@nestjs/bull`, and `bull` are dependencies (`apps/api/package.json:23,25,32-33`) and `CacheModule`/`BullModule` are **never imported** in `app.module.ts:12-23`. The Redis container runs (`docker-compose.yml:20-32`) with nothing connecting to it. `.github/copilot-instructions.md:920,926` describes both as in use.

**Caching layers actually present: zero.** No HTTP cache headers, no in-memory cache, no query cache, no CDN, no image cache, no service worker. React Query's `staleTime: 60000` (`providers.tsx:12`) applies to queries that do not exist.

---

## Offline support (Phase 2.23)

**Status: none, except accidentally.**

- No service worker, no `manifest.json`, no PWA configuration, no Workbox.
- No connectivity detection — `navigator.onLine` and the `online`/`offline` events are never referenced.
- No mutation queue, no optimistic updates, no sync/reconciliation, no conflict resolution.
- No offline UI affordance or messaging.

**Accidentally offline-capable:** because the frontend never calls the API for products, templates, designs, or orders, browsing the catalogue and using the editor work perfectly with the backend down. Only login, register, and forgot-password require the network. The comment at `checkout/page.tsx:376` — *"backend may not be running"* — shows this was a deliberate accommodation.

---

## Analytics and telemetry (Phase 2.17) {#analytics-and-telemetry-phase-217}

**Not present, in its entirety.**

No Google Analytics, GA4, Segment, Amplitude, Mixpanel, PostHog, Plausible, Vercel Analytics, or Speed Insights. No `gtag`, no `dataLayer`, no pixel. No event inventory, no user identification, no traits, no consent gating, no opt-out, no screen/page-view tracking, no funnels.

**Consequence:** there is no data about how anyone uses this application. Every performance and UX judgement in this document is structural inference, and would remain so even in production.

**Privacy upside:** zero third-party trackers.

---

## Crash reporting and monitoring (Phase 2.18)

**Not present.**

No Sentry, Bugsnag, Rollbar, Datadog, New Relic, or OpenTelemetry. No source-map upload pipeline. No `ErrorBoundary` anywhere in the React tree — **any render-time throw white-screens the entire route.** No `window.onerror` or `unhandledrejection` handler. No NestJS exception filter. No release/version tagging. No alerting. No APM. No `/health` endpoint despite `.github/copilot-instructions.md:972` requiring one.

`QA_AUDIT_REPORT.md:132` recommends adding error boundaries. Not done.

---

## Notifications, permissions, and background processing (Phases 2.19–2.21)

**All Not present.**

- **Notifications:** no push (FCM/APNs/Web Push), no local notifications, no Notification API, no service worker.
- **Browser permissions:** the application requests **zero** permissions. No geolocation, camera, microphone, clipboard, notification, or persistent-storage request. The only `navigator` reads are `hardwareConcurrency`, `deviceMemory`, and `userAgent` (`editor-3d-preview.tsx:18-20`), none of which is permission-gated.
- **Background processing:** no Web Workers, no `SharedWorker`, no `OffscreenCanvas`, no `requestIdleCallback`. Server-side: Bull is installed and unregistered; no cron, no scheduler, no queue.
- **Concurrency model:** single-threaded on both sides. The only asynchrony is `Promise`/`async` and Babylon's `runRenderLoop`.

---

## Memory (Phase 2.25)

### Resource creation → disposal audit

| Resource | Created | Disposed | Verdict |
|----------|---------|----------|---------|
| Fabric `Canvas` | `editor-canvas.tsx:158` | `:386` `canvas.dispose()` | ✅ |
| 11 Fabric event handlers | `:221-308` | Implicitly by `dispose()` | ✅ |
| 4 container DOM listeners | `:293-296` | `:380-383` | ✅ |
| 2 window key listeners (Space) | `:375-376` | `:384-385` | ✅ |
| 1 window key listener (shortcuts) | `:487` | `:488` | ✅ |
| `ResizeObserver` (canvas) | `:318` | `:379` | ✅ |
| Zustand subscription | `:393` | `:421` | ✅ |
| `setTimeout` (100 ms) | `:145` | `:146` | ✅ |
| Babylon `Engine` + `Scene` | `product-3d.ts:438,451` | `:674-675` | ✅ |
| Babylon render loop | `:629` | `:672` | ✅ |
| `visibilitychange` listener | `:658` | `:671` | ✅ |
| Design `Texture` | `:580` | `:571-573` on replace, `:673` on dispose | ✅ |
| `ResizeObserver` (3D) | `editor-3d-preview.tsx:63` | `:69` | ✅ |
| `setTimeout` (60 ms) | `:58` | `:68` | ✅ |
| Capture debounce timer | `:153` | `:165` | ✅ |
| 3 Fabric listeners (3D) | `:162` | `:166` | ✅ |
| 7 Fabric listeners (right panel) | `editor-right-panel.tsx:218-224` | `:226-232` | ✅ |
| 3 Fabric listeners (layers) | `editor-left-panel.tsx:596-598` | `:600-602` | ✅ |
| **`useDebouncedPushHistory` timer** | `editor-right-panel.tsx:87` | **NEVER** | ❌ **Leak** — no cleanup effect; a pending 500 ms push fires after unmount and captures a stale `canvas` from the store |
| **Babylon materials, meshes, textures** | `product-3d.ts` throughout | Only via `scene.dispose()` | ⚠️ `scene.dispose()` does cascade, but `woodTex`, `envTex`, `fabricTex` (`DynamicTexture`) and 8 `PBRMetallicRoughnessMaterial` instances are never explicitly disposed. Relies entirely on Babylon's cascade being complete |
| **`useEditorStore.canvas`** | `editor-canvas.tsx:322` | **NEVER set back to null** | ❌ **Retention** — the store holds a reference to the disposed canvas indefinitely after leaving the editor, keeping its entire object graph alive |
| **Undo/redo stacks** | `editor-store.ts:133` | **NEVER cleared on unmount** | ❌ **Retention** — up to 50 full canvas JSON strings survive navigation away from the editor |

**Disposal discipline is genuinely good — 18 of 21 resources are correctly released.** The three failures are all in the Zustand store's persistence beyond the component lifecycle.

### Allocation-heavy paths

1. `JSON.stringify(canvas.toJSON())` — 15 sites, on every mutation.
2. `canvas.toDataURL()` — base64 string of the full artboard, per capture.
3. `FileReader.readAsDataURL` — the entire uploaded file as a base64 string (`editor-left-panel.tsx:183`).
4. `new Texture(dataUrl, …)` — GPU upload per capture (`product-3d.ts:580`).
5. `createCottonTexture` — a 256 × 256 `DynamicTexture` filled by **16,384 iterations of a nested loop with a `Math.random()` call and a `fillRect` per 2 × 2 block** (`product-3d.ts:218-233`), executed synchronously on the main thread every time a t-shirt scene is built.

### Image/bitmap handling

No downsampling anywhere. Uploads are kept at full resolution as base64 (`editor-left-panel.tsx:177-183`); only the *display* is scaled via `scaleX`/`scaleY` (`fabric-objects.ts:73`). A 4000 × 3000 phone photo remains a 4000 × 3000 bitmap in memory, in the canvas JSON, in every undo entry, and in `localStorage` on save.

### Retain-cycle risks

`[UNVERIFIED: heap-snapshot confirmation — not measured.]` Structurally: the `canvas` retention in the store (above) is the clearest cycle-adjacent risk, since a Fabric canvas holds references to every object, which hold references to their images, which hold decoded bitmaps.

---

## Prioritised remediation

| # | Action | Fixes | Effort | Estimated win |
|---|--------|-------|--------|---------------|
| 1 | Compress/convert the three 3D textures (WebP or KTX2); delete `wood_diff.jpg` | PERF-01, PERF-18 | S | **~4–5 MB per editor load** |
| 2 | `next/dynamic` for `Editor3DPreview` and `EditorCanvas` | PERF-02 | S | Large initial-chunk reduction |
| 3 | Throttle the `object:moving`/`scaling`/`rotating` subscriptions to ~16 ms | PERF-03 | S | Removes ~60 re-renders/s during drags |
| 4 | Self-host fonts with `next/font/google` | PERF-07 | S | Two fewer origins, no render-blocking `@import` |
| 5 | Gate the 16 float animations behind `prefers-reduced-motion` and `IntersectionObserver` | PERF-06 | S | Continuous GPU load removed |
| 6 | Add DB indexes on `products.status`, `products.categoryId`, `designs.userId`, `orders.userId`, `order_items.orderId`, `design_templates.categoryId` | PERF-09 | S | Prevents future sequential scans |
| 7 | Paginate the four unbounded endpoints; cap `limit` at 100 | PERF-08 | S | Bounded responses |
| 8 | Clear `canvas`, `undoStack`, and `redoStack` on editor unmount; add cleanup to `useDebouncedPushHistory` | Memory | S | Removes the three retention leaks |
| 9 | Async `crypto.scrypt` | PERF-13 | S | Unblocks the API event loop |
| 10 | Downsample uploaded images to a max dimension before adding to the canvas | PERF-04, PERF-15, memory | M | Prevents the OOM path and the `localStorage` quota failure |
| 11 | Replace full-snapshot undo with deltas, or exclude image `src` from history | PERF-04, PERF-15 | L | Bounded memory |
| 12 | Memoise `totalPrice`/`totalItems` and the products filter | PERF-10 | S | Small but free |
| 13 | Swap `ts-jest` for `@swc/jest` in the API; close `TestingModule`s | PERF-17 | S | Faster suite, no worker leak |
| 14 | Register `CacheModule` for categories and templates, or remove the dependencies and fix the docs | PERF-20 | M | — |
| 15 | Feed the Fabric canvas element directly into a Babylon `DynamicTexture` | PERF-05 | L | Removes the base64 round trip per capture |
