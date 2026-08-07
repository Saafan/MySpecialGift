# 15 — Technical Debt Report

[← Index](./00-index.md)

This is the consolidated Phase 5 output: dead code, duplication, unused assets and dependencies, architecture smells, maintainability, scalability, and testing gaps — each with a carrying cost, a fixing cost, and the risk of leaving it.

**Effort scale:** S ≤ 2 h · M ≤ 1 day · L ≤ 1 week · XL > 1 week
**Ranking formula:** `(user impact × likelihood) ÷ remediation cost`, then bucketed.

---

## Ledger summary

| Severity | Items | Combined effort |
|----------|------:|----------------|
| 🔴 Critical | 8 | ~2 weeks |
| 🟠 High | 14 | ~2 weeks |
| 🟡 Medium | 21 | ~2 weeks |
| 🟢 Low | 17 | ~3 days |
| **Total** | **60** | **~6 weeks** |

---

## 🔴 Critical

| ID | Debt | Evidence | Cost of carrying | Cost to fix | Risk of leaving |
|----|------|----------|-----------------|-------------|-----------------|
| **TD-01** | No version control | `git rev-parse` → `fatal: not a git repository` | Every change is irreversible; no attribution, no bisect, no rollback | **S** (`git init`, fix `.gitignore:48`, commit) | Catastrophic and permanent |
| **TD-02** | No authentication enforcement; `x-user-id` is the identity | `designs.controller.ts:21`, `orders.controller.ts:39`; no guard anywhere in `apps/api/src` | The API cannot be exposed to any network | **M** | Total data compromise |
| **TD-03** | Client-supplied `unitPrice` on orders | `orders.controller.ts:33` → `orders.service.ts:48` | Financial records are attacker-controlled | **S** | Fraud |
| **TD-04** | Checkout is a `setTimeout` facade | `checkout/page.tsx:373-386` | The core commerce flow does not exist; users lose their cart | **M** (wire to `ordersApi.create`, which already exists) | Product is not shippable |
| **TD-05** | Web test suite cannot start | `apps/web/jest.config.ts:9` — verified `TS2322` on execution | ~90 tests provide zero protection while appearing to provide coverage | **S** (two lines) | All frontend regressions ship silently |
| **TD-06** | E2E suite cannot run and is 8+ assertions stale | `playwright.config.ts:12` vs `apps/web/package.json:6`; `e2e/bug-regression.spec.ts:17,47,50,57,63`; `e2e/user-journey.spec.ts:230-236,701-714,781` | The nine "verified fixed" QA bugs cannot be re-verified | **M** | Regression of already-fixed bugs |
| **TD-07** | `.gitignore:48` excludes Prisma migrations | `.gitignore:48` vs `migration_lock.toml:2` | Schema history will be destroyed on first commit | **S** (delete one line) | Unreproducible database state |
| **TD-08** | The frontend is disconnected from the backend | `lib/api.ts:27-73` — five API namespaces, **zero importers**; `products/page.tsx:11-20`, `products/[id]/page.tsx:41-166` hardcode the catalogue | Two systems that cannot diverge-detect; 20 tested endpoints unreachable; the product is a demo | **L** | The project never becomes real |

---

## 🟠 High

| ID | Debt | Evidence | Cost of carrying | Fix | Risk |
|----|------|----------|-----------------|-----|------|
| **TD-09** | No ESLint configuration exists | `npm run lint` in both apps; no `.eslintrc*` or `eslint.config.*` in the census | `eslint-config-next` (with `jsx-a11y` and `react-hooks`) is installed and inert. 14 unsuppressed `<img>` violations and 16 label violations would all be caught | **S** | Defect classes stay open |
| **TD-10** | Product catalogue duplicated 4× and already divergent | `page.tsx:33-62`, `products/page.tsx:11-20`, `products/[id]/page.tsx:41-166`, `seed.ts:107-140` | Product 2 already disagrees between copies | **M** | User-visible inconsistency |
| **TD-11** | Pricing rules duplicated 3× | `cart/page.tsx:140,146,154`; `checkout/page.tsx:62-64`; `orders.service.ts:51-53` | Frontend and backend totals can silently diverge | **S** (extract a shared module in `packages/`) | Financial mismatch |
| **TD-12** | `localStorage` key format has 3 independent parsers, one already broken | `editor-toolbar.tsx:69-71`, `editor-canvas.tsx:325`, `my-designs/page.tsx:27,47,179` | "Edit Design" opens a blank canvas today | **S** | Perceived data loss |
| **TD-13** | 21 declared-but-unimported dependencies | See [05](./05-dependency-analysis.md#declared-but-imported-nowhere-candidate-removals) | Install size, audit surface, and false signals about the architecture | **S** | Confusion; `sharp` and `@medusajs/medusa` are heavy |
| **TD-14** | `.github/copilot-instructions.md` has ~14 false claims | See [03](./03-technology-stack.md#38-documented-vs-actual-technology-discrepancies) | It is declared the "single source of truth for all AI agents" (`:3`) and will actively mislead them | **M** | Compounding wrong decisions |
| **TD-15** | No error boundary anywhere | Zero `ErrorBoundary` / `componentDidCatch` in `apps/web/src` | Any render throw white-screens the route | **S** | Total UI loss on a recoverable error |
| **TD-16** | Prisma generate not hooked to install or build | `apps/api/package.json:7` is bare `nest build` | A fresh clone reproduces the 4-error failure in `.turbo/turbo-build.log` | **S** (`postinstall`) | Broken onboarding |
| **TD-17** | Three Docker/Compose definitions cannot work | `Dockerfile.web:22` (no `standalone`), `Dockerfile.api:5-6` (no lockfile in context), `docker-compose.yml:42,64` (port 9000 collision) | There is no deployment path | **M** | Cannot ship |
| **TD-18** | No DTO classes; `ValidationPipe` is inert | `main.ts:20-26` + inline interfaces at 8 body sites | All input validation is absent despite appearing configured | **M** | Enables TD-03 and unbounded payloads |
| **TD-19** | `editor-right-panel.tsx` is 953 lines with 7 components | `apps/web/src/components/editor/editor-right-panel.tsx` | The single most bug-prone file; generic primitives trapped inside | **L** | Regression of BUG-P01 |
| **TD-20** | `editor-left-panel.tsx` is 671 lines with 8 components | `apps/web/src/components/editor/editor-left-panel.tsx:96-671` | No code splitting; all seven panels load together | **M** | Merge conflicts, slow iteration |
| **TD-21** | A 241-line `useEffect` owning 11 concerns | `editor-canvas.tsx:149-390` | Any dependency change destroys the canvas and all unsaved work | **L** | Data loss on category switch |
| **TD-22** | 16 unassociated form labels | `register/page.tsx`, `checkout/page.tsx`, `forgot-password/page.tsx`, `print-area-panel.tsx`, `editor-right-panel.tsx` | WCAG A failure; BUG #9 was fixed on one page only | **S** | Accessibility non-compliance |

---

## 🟡 Medium

| ID | Debt | Evidence | Fix |
|----|------|----------|-----|
| **TD-23** | `useEditorStore.layers` subsystem is 100 % dead, with 10 tests | `editor-store.ts:9-16,21,36-41,84-107`; `editor-store.spec.ts:119-247` | S — delete both |
| **TD-24** | `activeObjectId` written by 4 sites, read by none | `editor-canvas.tsx:240,247,252`; `editor-left-panel.tsx:643` | S |
| **TD-25** | `rightPanelOpen` read once, never written — no toggle UI | `editor-store.ts:29,45`; `editor/[productId]/page.tsx:15,35` | S — add the toggle or remove the state |
| **TD-26** | `CartStore.isOpen` / `toggleCart` — a drawer that was never built | `cart-store.ts:17,23,60` | S |
| **TD-27** | `components/ui/card.tsx` — 78 lines, zero imports | `apps/web/src/components/ui/card.tsx` | S — delete, or adopt it in place of `.card-fun` |
| **TD-28** | `packages/types` has zero consumers and zero declared deps | `packages/types/package.json:1-7` | M — adopt it in both apps, or delete it |
| **TD-29** | `apps/api/tests/fixtures/index.ts` (127 lines) — zero imports | — | S |
| **TD-30** | `apps/api/tests/helpers/test-utils.ts` — zero imports | — | S |
| **TD-31** | `apps/api/tests/mocks/s3.mock.ts` — zero imports; duplicated inline at `assets.service.spec.ts:10-26` | — | S |
| **TD-32** | `MedusaService` + `MedusaModule` — injected, never invoked; the Compose service cannot run Medusa | `orders.service.ts:9`; `docker-compose.yml:53-71` | M — wire it up or remove it |
| **TD-33** | 4 service methods with no HTTP route | `products.service.ts:78,85,93`; `templates.service.ts:53`; `orders.service.ts:80` | S — expose or delete |
| **TD-34** | `/3d/wood_diff.jpg` — 215,573 B, unreferenced | `apps/web/public/3d/` | S — **215 KB saved** |
| **TD-35** | 9 unused Radix packages while every dialog/menu/tab is hand-rolled and inaccessible | `apps/web/package.json:17-25` | M — adopting them fixes 4 accessibility findings at once |
| **TD-36** | Auth page shell duplicated 3× | `login/page.tsx:43-52`, `register/page.tsx:56-63`, `forgot-password/page.tsx:34-41` | S |
| **TD-37** | Page shell duplicated 8× | 11 occurrences of the gradient + Navbar + container + Footer pattern | M — route-group layouts |
| **TD-38** | Product card duplicated 3× | `page.tsx:174-201`, `products/page.tsx:221-253`, `my-designs/page.tsx:125-186` | S |
| **TD-39** | Empty state duplicated 4× | `cart/page.tsx:28-52`, `checkout/page.tsx:66-87`, `my-designs/page.tsx:57-81,104-121` | S |
| **TD-40** | Order summary duplicated 2× with different arithmetic | `cart/page.tsx:124-172` vs `checkout/page.tsx:396-426` | S |
| **TD-41** | `lib/editor-artboard.ts` imports the Zustand store | `editor-artboard.ts:4,92-93,105` | M — makes 3 modules untestable |
| **TD-42** | `getArtboardBounds(canvas, category)` discards `category` with `void category` | `editor-artboard.ts:32`; 9 call sites pass it | S |
| **TD-43** | Zoom bounds `[0.25, 3]` defined twice | `editor-store.ts:109`, `canvas-viewport.ts:3-4` | S |
| **TD-44** | Route groups exist with no `layout.tsx`; `checkout` forgets `<Footer/>` | `(auth)/`, `(shop)/`, `(editor)/` | M |

---

## 🟢 Low

| ID | Debt | Evidence |
|----|------|----------|
| **TD-45** | Root `tsconfig.json` is orphaned — neither app `extends` it | `tsconfig.json:1-18` |
| **TD-46** | `apps/api` `lint` script globs `apps/**` and `libs/**`, which do not exist there | `apps/api/package.json:10` |
| **TD-47** | `start` and `start:prod` are identical | `apps/api/package.json:8-9` |
| **TD-48** | `packages/types` has no `scripts`, so `turbo run test` silently skips it | `packages/types/package.json` |
| **TD-49** | `.env.example` `DATABASE_URL` uses port 5432; Compose publishes 5433 | `.env.example:5` vs `docker-compose.yml:11` |
| **TD-50** | `README.md` documents `packages/shared` and `packages/editor`, which do not exist | `README.md:56-57` |
| **TD-51** | `design-system/mylovelygift/MASTER.md` palette contradicts the implementation | `MASTER.md:21-23` vs `tailwind.config.ts:25,39,53` |
| **TD-52** | Dark mode configured (`darkMode: ["class"]`) with no `.dark` block and no toggle | `tailwind.config.ts:4`; `globals.css:7-31` |
| **TD-53** | `animate-pulse-glow` and `animate-accordion-*` defined, never used | `tailwind.config.ts:130-133,118-125` |
| **TD-54** | `Button` variant `accent`, size `xl`, prop `asChild` — never used | `button.tsx:23-24,30,44` |
| **TD-55** | `uuid` dependency for one call; `crypto.randomUUID()` is available and already used in the frontend | `assets.service.ts:35` vs `cart-store.ts:35` |
| **TD-56** | Seed uses `create` (not `upsert`) for the 6 design templates | `seed.ts:151,162,178,189,205,216` |
| **TD-57** | `blankCupTemplate` assigned and never used | `seed.ts:151` |
| **TD-58** | `allProducts` declared and never used | `products/[id]/page.tsx:17` |
| **TD-59** | `console.error` in production frontend code | `editor-toolbar.tsx:60` |
| **TD-60** | 14 PNG screenshots and `.playwright-mcp/` (101 files) at the repo root, not gitignored | Repo root; `.gitignore:42` covers only `.playwright-cli/` |

---

## Dead code inventory

### Unreachable / unused exports

| Symbol | File | Line |
|--------|------|-----:|
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `components/ui/card.tsx` | 78 |
| `productsApi`, `templatesApi`, `designsApi`, `ordersApi`, `assetsApi` | `lib/api.ts` | 27, 35, 44, 56, 67 |
| `setLayers`, `addLayer`, `removeLayer`, `updateLayer`, `reorderLayers`, `EditorLayer` | `store/editor-store.ts` | 9, 37-41 |
| `toggleCart` | `store/cart-store.ts` | 60 |
| `ProductsService.create/update/delete` | `modules/products/products.service.ts` | 78, 85, 93 |
| `TemplatesService.createDesignTemplate` | `modules/templates/templates.service.ts` | 53 |
| `OrdersService.updateStatus` | `modules/orders/orders.service.ts` | 80 |
| `MedusaService.getClient/getProducts/getProduct/createCart/addToCart/completeCart` | `common/medusa/medusa.service.ts` | 16-46 |
| All 12 interfaces + `OrderStatus` | `packages/types/src/index.ts` | 1-141 |
| `fixtures` | `apps/api/tests/fixtures/index.ts` | 6 |
| `createTestingModule` | `apps/api/tests/helpers/test-utils.ts` | 8 |
| `mockS3Send` | `apps/api/tests/mocks/s3.mock.ts` | 3 |
| `resetCanvasViewport` — used ✅, but `clampCanvasPan` is only used internally | `lib/canvas-viewport.ts` | 19 |

### Unused local variables

| Variable | File | Line |
|----------|------|-----:|
| `allProducts` | `products/[id]/page.tsx` | 17 |
| `blankCupTemplate` | `prisma/seed.ts` | 151 |
| `initialState` | `apps/web/tests/unit/store/editor-store.spec.ts` | 5 |
| `NotFoundException`, `UnauthorizedException` (imported, unused) | `order-business-rules.spec.ts` | 6 |
| `Extends<A,B>` (declared, unused) | `packages/types/tests/types.spec.ts` | 22 |
| `Sparkles` (imported, unused) | `editor-left-panel.tsx` | 14 |
| `Type`, `Image`, `Layers` (imported, unused) | `editor-right-panel.tsx` | 5, 6, 12 |
| `ShoppingBag` alias (imported once, used once) | `checkout/page.tsx` | 6 ✅ used |
| `Sparkles`, `ShoppingBag`, `Zap` — `ShoppingBag` unused | `page.tsx` | 2 |
| `Filter` — used ✅; `Sparkles` unused | `products/page.tsx` | 6 |

`[UNVERIFIED: the unused-import list is derived by reading each file's JSX for the symbol; a linter run would be authoritative. Since no ESLint config exists, none has ever run.]`

### Commented-out code

**None.** Verified by exhaustive grep. This is a genuine strength.

---

## Unused assets

| Asset | Bytes | Referenced by |
|-------|------:|---------------|
| `apps/web/public/3d/wood_diff.jpg` | **215,573** | **Nothing** |
| 14 root-level `*.png` screenshots | **2,196,370** | Nothing (test artifacts) |
| `.playwright-mcp/` | **2,701,706** | Nothing (test artifacts, not gitignored) |
| `.playwright-cli/` | 28,502,756 | Nothing (test artifacts, gitignored) |
| `.github/prompts/ui-ux-pro-max/scripts/__pycache__/` | 164,741 | Nothing (compiled bytecode) |

**All 26 SVGs are referenced.** Verified: 8 products (`page.tsx`, `products/page.tsx`, `products/[id]/page.tsx`), 6 stock (`editor-left-panel.tsx:425-430`), 11 templates (`templates/page.tsx:14-51`, `editor-templates.ts:84-296`), 1 favicon (`layout.tsx:11`).

**No referenced-but-missing assets.** Every `src`/`href` in the code resolves to a file that exists.

**Translation keys: N/A** — no i18n system exists.

**Immediately reclaimable from the shipped bundle: 215,573 B** (`wood_diff.jpg`). Reclaimable from the repository: ~33 MB of test artifacts.

---

## Architecture smells

| Smell | Instance | Severity |
|-------|----------|----------|
| **God file** | `editor-right-panel.tsx` (953 lines, 7 components), `editor-left-panel.tsx` (671 lines, 8 components), `product-3d.ts` (679 lines) | High |
| **God function** | `editor-canvas.tsx:149-390` — a 241-line effect | High |
| **Business logic in the UI** | Tax and shipping arithmetic inline in JSX (`cart/page.tsx:140,146,154-156`); price hardcoded in the toolbar (`editor-toolbar.tsx:54`) | High |
| **Leaky abstraction** | `products.service.ts:3,16,78,85` exposes Prisma's generated types in its public signature | Medium |
| **Layering violation** | `lib/editor-artboard.ts:4` imports the React store into a geometry module | Medium |
| **Hidden global state** | `useEditorStore.getState().canvas` used as a service locator in 5 files | High |
| **Global mutable static** | `FabricObject.customProperties = [...]` at module scope (`editor-canvas.tsx:29`) | Medium |
| **Shotgun surgery** | Changing the `localStorage` key format requires edits in 4 places; changing the pricing rule in 3; changing a product in 4 | High |
| **Feature envy** | `editor-artboard.ts`, `editor-templates.ts`, and `fabric-objects.ts` all reach into the store and each other | Medium |
| **Inconsistent parallel modules** | 4 of 5 API services use hand-written types; `products.service.ts` uses Prisma types. 6 of 7 left panels are stateless; `UploadsPanel` and `ImagesPanel` hold local state | Low |
| **Dead abstraction** | `packages/types` — a shared-types package with no consumers; `MedusaService` — an integration layer with no traffic | Medium |
| **Anaemic route groups** | `(auth)`, `(shop)`, `(editor)` with no layouts | Low |
| **Cyclic-adjacent coupling** | `editor-artboard.ts → editor-store.ts → product-print-limits.ts → product-catalog.ts`, pulling the store into every editor utility | Medium |

**No true circular imports exist.** Verified by reading every `import` in both apps.

---

## Maintainability

| Metric | Finding |
|--------|---------|
| **Longest function** | `editor-canvas.tsx:149-390` — 241 lines |
| **Deepest nesting** | `editor-right-panel.tsx:425-496` — 8 levels of JSX; `product-3d.ts:528-535` — a triple-nested ternary selecting the product builder |
| **Longest parameter list** | `ProductCanvas` — 7 props (`editor-3d-preview.tsx:25-33`); `computeArtboardLayout` — 4 (`editor-artboard.ts:53-58`). All reasonable |
| **`any` usage** | 18 occurrences: `designs.controller.ts:37,47`; `designs.service.ts:29,34`; `orders.controller.ts:36,37`; `orders.service.ts:44,45,83`; `templates.service.ts:57`; `editor-left-panel.tsx:331`; `editor-right-panel.tsx:28,324,340,360,611,789,903`; `editor-canvas.tsx:162,186,456,477`; `editor-store.ts:162,186`; `product-catalog.ts` — none. **None is documented with a reason**, violating `.github/copilot-instructions.md:297` |
| **Type safety** | Strong overall — `strict: true` in all three tsconfigs; API `tsc --noEmit` exits 0; web `tsc` has exactly one error, in `jest.config.ts` |
| **Naming consistency** | Good, with two exceptions: `shipping_form`/`payment_form` are the only snake_case variables in the frontend (`checkout/page.tsx:20,29`); `bg-success-DEFAULT`-style class names are awkward but forced by the token structure |
| **Comment quality** | **Excellent where present.** 35 explanatory comments documenting non-obvious constraints (catalogued in [13](./13-historical-bug-report.md#explanatory-comments-that-document-a-past-failure)). Near-zero narration comments |
| **Formatting** | Consistent 2-space, double quotes, semicolons — but **enforced by nothing**. No Prettier, no ESLint, no `.editorconfig` |
| **File-size distribution** | 10 files exceed 250 lines; 3 exceed 650. Median first-party source file is ~90 lines |

---

## Scalability concerns

| Concern | Evidence | Breaks at |
|---------|----------|-----------|
| Frontend catalogue is a hardcoded array | `products/page.tsx:11-20` | Any real catalogue. Filtering is O(n) per render with no virtualisation |
| No list virtualisation anywhere | All grids map directly | ~500 DOM nodes |
| 4 unpaginated API endpoints | `designs.service.ts:9`, `orders.service.ts:13`, `templates.service.ts:9,18` | A user with hundreds of designs; a tenant with hundreds of templates |
| `GET /products?limit` has no maximum | `products.service.ts:40` | `?limit=999999` today |
| Missing indexes on `status`, `userId`, and all FKs | `migration.sql:211-238` | ~10⁵ rows |
| Undo stack holds 50 full canvas snapshots including base64 images | `editor-store.ts:133` | One large uploaded image |
| `localStorage` for cart and designs | `cart-store.ts:66`, `editor-toolbar.tsx:71` | ~5 MB browser quota |
| Cart has no server persistence | `.github/copilot-instructions.md:715` acknowledges it | Cross-device use |
| Single-threaded synchronous `scryptSync` | `auth.service.ts:29,37` | Concurrent logins |
| No caching layer of any kind | `CacheModule` never registered | Read-heavy load |
| No queue despite Bull being installed | `BullModule` never registered | Any async work (print-file generation, email) |
| Tenancy enforced by convention, not by policy | 3 unscoped endpoints; `Design` has no `tenantId` | The second tenant |
| 953-line and 671-line components | `editor-right-panel.tsx`, `editor-left-panel.tsx` | A second developer |
| No CI | — | A second developer |

---

## Testing gaps, ranked by risk

| Rank | Gap | Evidence |
|-----:|-----|----------|
| 1 | **Zero component tests.** `@testing-library/react` is installed; only `act` is imported | `cart-store.spec.ts:2`, `editor-store.spec.ts:2` |
| 2 | **The web suite cannot start** | `apps/web/jest.config.ts:9` |
| 3 | **The E2E suite cannot start** (port) and is 8+ assertions stale | `playwright.config.ts:12` |
| 4 | The entire 3D pipeline (961 lines) has zero tests | `product-3d.ts`, `editor-3d-preview.tsx` |
| 5 | The canvas lifecycle and legacy-migration path have zero tests — and that code runs against real user data | `editor-canvas.tsx:96-142` |
| 6 | The 2D↔3D aspect-ratio contract has no assertion | `product-3d.ts:167-177` |
| 7 | BUG-P01's fix has no test; a new control that omits `canvas.fire` reintroduces it silently | `editor-right-panel.tsx` |
| 8 | The undo/redo race has no test | `editor-store.ts:159-174` |
| 9 | Pure geometry functions are untested despite being trivially testable | `editor-artboard.ts`, `product-print-limits.ts`, `product-catalog.ts` |
| 10 | No integration tests despite `.github/copilot-instructions.md:789-794` prescribing them | — |
| 11 | No coverage threshold in any Jest config | `apps/api/jest.config.ts`, `apps/web/jest.config.ts` |
| 12 | 5 tests contain assertions that cannot fail | `api.spec.ts:77-163`; `user-journey.spec.ts:399,406,877` |
| 13 | Checkout validation is covered only by an E2E test asserting the wrong string | `bug-regression.spec.ts:63` |
| 14 | `main.ts` is explicitly excluded from coverage | `apps/api/jest.config.ts:13` |
| 15 | `apps/api` tests leak worker processes (no `module.close()`) | Observed on execution |

---

## Consolidated ledger, ranked by `(impact × likelihood) ÷ cost`

| Rank | ID | Item | Impact | Likelihood | Cost | Score |
|-----:|----|------|:------:|:----------:|:----:|------:|
| 1 | TD-01 | Initialise git | 5 | 5 | S(1) | **25** |
| 2 | TD-07 | Remove `.gitignore:48` | 5 | 5 | S(1) | **25** |
| 3 | TD-05 | Fix `jest.config.ts` (2 lines) | 4 | 5 | S(1) | **20** |
| 4 | TD-03 | Server-side price lookup | 4 | 5 | S(1) | **20** |
| 5 | TD-16 | `postinstall: prisma generate` | 3 | 5 | S(1) | **15** |
| 6 | TD-09 | Create `.eslintrc.json` | 3 | 5 | S(1) | **15** |
| 7 | TD-06 | Fix the Playwright port + stale assertions | 3 | 5 | M(2) | **7.5** |
| 8 | TD-02 | Auth guard + token verification | 5 | 5 | M(2) | **12.5** |
| 9 | TD-12 | Unify the `localStorage` key derivation | 3 | 5 | S(1) | **15** |
| 10 | TD-11 | Extract shared pricing rules | 3 | 3 | S(1) | **9** |
| 11 | TD-15 | Add error boundaries | 4 | 3 | S(1) | **12** |
| 12 | TD-22 | Fix the 16 form labels | 3 | 5 | S(1) | **15** |
| 13 | TD-34 | Delete `wood_diff.jpg` | 1 | 5 | S(1) | **5** |
| 14 | TD-13 | Remove 21 unused dependencies | 2 | 5 | S(1) | **10** |
| 15 | TD-04 | Wire checkout to `ordersApi.create` | 5 | 4 | M(2) | **10** |
| 16 | TD-14 | Correct `copilot-instructions.md` | 3 | 5 | M(2) | **7.5** |
| 17 | TD-18 | Add `class-validator` DTOs | 4 | 4 | M(2) | **8** |
| 18 | TD-17 | Fix the Docker definitions | 3 | 4 | M(2) | **6** |
| 19 | TD-10 | Single source for the catalogue | 3 | 4 | M(2) | **6** |
| 20 | TD-08 | Connect the frontend to the API | 5 | 4 | L(4) | **5** |
| 21 | TD-19 | Split `editor-right-panel.tsx` | 3 | 3 | L(4) | **2.3** |
| 22 | TD-21 | Decompose the 241-line effect | 4 | 3 | L(4) | **3** |
| 23 | TD-35 | Adopt Radix for dialogs/menus/tabs | 3 | 3 | M(2) | **4.5** |
| 24 | TD-28 | Adopt or delete `packages/types` | 2 | 4 | M(2) | **4** |

**Interpretation:** the top six items are all **S**-effort and together remove the two catastrophic operational risks (no VCS, migrations excluded), restore two testing gates, close one critical security hole, and unblock the build. **They can plausibly be done in a single afternoon and should precede everything else.**
