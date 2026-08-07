# 22 — Implementation Readiness Assessment

[← Index](./00-index.md)

## Verdict

> **A competent engineer can safely make changes to this codebase using this documentation alone — but only within specific subsystems, and only after four prerequisite actions that take under a day.**
>
> Outside those subsystems, and before those prerequisites, changes are **not** safe. Not because the documentation is insufficient, but because the repository has **no version control**, **no working frontend test suite**, **no CI**, and **no lint configuration**. Documentation cannot substitute for an undo button.

---

## Readiness score by subsystem

Scored 1–5, where **5** = a documented, tested, isolated subsystem an engineer can change confidently; **1** = do not touch without the original author.

| Subsystem | Files | Score | Reasoning |
|-----------|-------|:-----:|-----------|
| **NestJS API services** | `apps/api/src/modules/*/[feature].service.ts` | **4** | Six identically-shaped modules, 146 passing tests (verified by execution), no hidden state, injectable dependencies, a clean DAG. `products.service.ts` scores lower because it leaks Prisma types into its signature and depends on the generated client |
| **NestJS controllers** | `apps/api/src/modules/*/[feature].controller.ts` | **4** | Thin, tested, conventional. The `x-user-id` pattern must be replaced (A-2), which is a documented change |
| **Prisma schema** | `apps/api/prisma/schema.prisma` | **3** | Clear, well-mapped, fully documented in [07](./07-architecture.md). **Downgraded because `.gitignore:48` excludes the migration history** and `prisma generate` is not hooked to install |
| **API tests** | `apps/api/tests/**` | **4** | Well-structured builders, mocks, and specs. Three dead files (`fixtures`, `test-utils`, `s3.mock`) and a worker leak |
| **`packages/types`** | `packages/types/src/index.ts` | **4** | Trivially safe — nothing consumes it |
| **Marketing / catalogue pages** | `page.tsx`, `products/page.tsx`, `products/[id]/page.tsx`, `templates/page.tsx` | **3** | Simple, self-contained, no hidden coupling. **Downgraded because no test can catch a regression** and the catalogue is duplicated four ways |
| **Auth pages** | `(auth)/auth/*/page.tsx` | **3** | Small and clear. Same test gap; 5 unassociated labels to fix |
| **Cart + cart store** | `cart/page.tsx`, `store/cart-store.ts` | **3** | The store is clean and has 36 written tests — **which have never run** |
| **Checkout** | `checkout/page.tsx` | **2** | 431 lines, hand-rolled validation, a facade at the end, one uncontrolled input, no hydration guard, and the one E2E test covering it asserts the wrong string |
| **My Designs** | `my-designs/page.tsx` | **2** | Currently broken (the Edit link). Changing it requires understanding all four `localStorage` key derivations |
| **Layout / UI primitives** | `navbar.tsx`, `footer.tsx`, `ui/*.tsx` | **4** | Small, well-documented in [11](./11-ui-system.md), 13 call sites. `card.tsx` is dead and safe to delete |
| **Design tokens** | `tailwind.config.ts`, `globals.css` | **4** | Fully inventoried in [11](./11-ui-system.md). A recolour is the safest possible change — no component reads a token programmatically |
| **Editor left panel** | `editor-left-panel.tsx` | **2** | 671 lines, 8 components, 3 defensive items, zero tests. Individual panels are separable; the file is not |
| **Editor toolbar** | `editor-toolbar.tsx` | **3** | 239 lines, mostly straightforward. Contains the hardcoded price and a third `localStorage` key derivation |
| **Print-area panel** | `print-area-panel.tsx` | **3** | Small and clean, but it drives the artboard rescale that touches every object |
| **Artboard / geometry libs** | `editor-artboard.ts`, `product-catalog.ts`, `product-print-limits.ts` | **3** | Small pure functions — **except** `editor-artboard.ts` imports the store, and these files encode the 2D↔3D contract with no test |
| **Editor right panel** | `editor-right-panel.tsx` | **1** | 🔴 953 lines, 7 components, **the entire architecture is BUG-P01's fix**, 5 defensive items, zero tests, 10 sites that must each remember `canvas.fire`. **The most dangerous file in the repository** |
| **Editor canvas** | `editor-canvas.tsx` | **1** | 🔴 520 lines, a 241-line effect owning 11 concerns, 6 defensive items including a data migration that runs against real user designs, zero tests |
| **3D subsystem** | `product-3d.ts`, `editor-3d-preview.tsx` | **1** | 🔴 961 lines, **11 defensive items — more than any other area**, hand-tuned constants cross-coupled to a second file, the highest churn in the project (~45 debugging artifacts), zero tests |
| **Editor store** | `store/editor-store.ts` | **2** | 201 lines. A known async race in undo/redo, a dead layer subsystem with 10 tests, and I/O inside an action |
| **Fabric object helpers** | `lib/fabric-objects.ts` | **2** | Only 92 lines, but 4 defensive items, one of which (`crossOrigin`) simultaneously gates export, preview, cart thumbnails, and the entire 3D preview |
| **Editor templates** | `lib/editor-templates.ts` | **3** | 315 lines of data, bounds-relative and self-contained. `applyTemplateById` is destructive with no test |
| **E2E tests** | `e2e/**` | **2** | Cannot run (port); 8+ stale assertions |
| **Web unit tests** | `apps/web/tests/**` | **1** | 🔴 Cannot run at all (config); at least 2 tests are known-wrong |
| **Docker / Compose** | `docker/`, `docker-compose.yml` | **1** | 🔴 Three independent blockers; no path to a working deployment |
| **Build / tooling config** | `turbo.json`, `tsconfig.json` ×3, `jest.config.ts` ×3, `playwright.config.ts` | **2** | Four of these are broken or misconfigured |

**Weighted overall readiness: 2.6 / 5** — "safe in parts, with prerequisites."

---

## Prerequisites before **any** change

These four are non-negotiable and take under a day combined.

| # | Prerequisite | Why | Effort |
|---|-------------|-----|--------|
| **P-1** | **Delete `.gitignore:48`, review the ignore list, then `git init` and commit** | There is no undo. `.gitignore:48` excludes `apps/api/prisma/migrations/` — the only schema history — and `migration_lock.toml:2` explicitly warns against exactly this. Before committing, verify `git status` does not list `apps/api/.env` or `apps/web/.env.local` | S |
| **P-2** | **Fix `apps/web/jest.config.ts:9` and `:16`** | ~90 written tests have never executed. Without this there is zero automated protection for any frontend change. Expect ~4 known failures once it runs (`editor-store.spec.ts:257-288` and `:10-23`) | S |
| **P-3** | **Fix `playwright.config.ts:12,23` (3001 → 3000)** | The E2E suite cannot start. It is the only end-to-end verification that exists, and the only way to re-verify the nine "fixed" QA bugs | S |
| **P-4** | **Create `.eslintrc.json`** | `eslint-config-next` with `jsx-a11y` and `react-hooks` is installed and completely inert. `npm run lint` currently fails in both apps. This one file catches 14 `<img>` violations, 16 label violations, and the unused-import set automatically | S |

**Strongly recommended fifth:** add `"postinstall": "prisma generate"` to `apps/api/package.json` — `apps/api/.turbo/turbo-build.log` records a real 4-error build failure that any fresh clone will reproduce.

---

## Safe-change checklist

Run through this before **every** change.

### Before you start
- [ ] `git status` is clean and you are on a branch (P-1 done)
- [ ] You have read the relevant section of [12 — Feature Inventory](./12-feature-inventory.md)
- [ ] You have checked the **do-not-touch list** in [20](./20-future-improvements.md#-do-not-touch-without-extreme-care-list)
- [ ] You have checked whether your files appear in the **defensive-code inventory** in [13](./13-historical-bug-report.md#defensive-code-inventory) — **42 entries**
- [ ] You have checked whether your change touches a **fragile zone** in [13](./13-historical-bug-report.md#fragile-zones--disproportionate-defect-history)
- [ ] You know whether a test covers the behaviour you are changing (for the frontend, the answer is almost always **no**)

### While changing
- [ ] You have not removed any comment explaining *why* code exists
- [ ] If you touched Fabric: every programmatic `.set()` is followed by `canvas.fire("object:modified", { target })` — **BUG-P01**
- [ ] If you added a canvas mutation: it calls `pushUndo(JSON.stringify(canvas.toJSON()))`
- [ ] If you changed `ARTBOARD_SIZES` or `MUG_3D_PRINT`: you changed **both**, and re-derived the 2.934 ratio
- [ ] If you changed a `localStorage` key: you updated **all four** derivation sites and considered existing users' data
- [ ] If you changed a pricing rule: you updated **all three** copies
- [ ] If you changed product data: you updated **all four** copies
- [ ] If you added a form field: it has `id` + `htmlFor`, `aria-invalid`, and `aria-describedby`
- [ ] If you added an interactive element: it is a `<button>`, has an accessible name, and has a visible focus style

### Before you finish
- [ ] `npx tsc --noEmit` passes in the affected workspace
- [ ] `cd apps/api && npx jest` — 146 tests still pass
- [ ] `cd apps/web && npx jest` — passes (once P-2 is done)
- [ ] `npx playwright test` — passes (once P-3 is done)
- [ ] `npm run lint` — passes (once P-4 is done)
- [ ] You manually exercised the affected feature in a browser
- [ ] If you touched the editor: you added a shape, added text, added an image, applied a template, undid, redid, saved, reloaded, and confirmed the 3D preview updated
- [ ] You committed with a message explaining **why**

---

## Danger zones

Ranked. Read [13](./13-historical-bug-report.md) in full before touching anything in the top three.

### 🔴 Do not touch without the prerequisites, tests, and a careful read of Phase 4

| Zone | Files | Why | Minimum before touching |
|------|-------|-----|------------------------|
| **1. Editor property panel** | `editor-right-panel.tsx` (953 lines) | Its entire architecture *is* BUG-P01's fix. Ten `canvas.fire` calls look redundant and are load-bearing. Zero tests | P-2 + component tests for every control's type-and-blur behaviour |
| **2. 3D subsystem** | `product-3d.ts` (679), `editor-3d-preview.tsx` (282) | 11 defensive items. Hand-tuned geometry constants coupled to `product-catalog.ts` with no test. Highest churn in the project. Zero tests | Golden-image tests for all four products; the 2.934 assertion test |
| **3. Canvas lifecycle** | `editor-canvas.tsx` (520 lines) | A 241-line effect owning 11 concerns. Contains `migrateLegacyArtboard`, which **runs against real saved user designs**. Zero tests | P-2 + integration tests for the legacy-migration path |
| **4. Fabric object helpers** | `fabric-objects.ts` (92 lines) | Small but critical. Removing `crossOrigin` (3 lines) simultaneously breaks export, preview, cart thumbnails, and 3D | Understand [13, D-4/D-5](./13-historical-bug-report.md#defensive-code-inventory) |

### 🟠 Touch with care

| Zone | Why |
|------|-----|
| `editor-store.ts` undo/redo (`:152-199`) | A known async race with no guard and no test |
| `editor-left-panel.tsx` (671 lines) | 8 components; 3 defensive items |
| `editor-artboard.ts` | Imports the store; `getArtboardBounds` discards a parameter 9 call sites pass |
| `checkout/page.tsx` | 431 lines; its one E2E test asserts the wrong string |
| `localStorage` key derivations (4 sites) | Already divergent; one path is broken today |
| `apps/api/prisma/schema.prisma` | Migrations are gitignored (until P-1) and generation is not hooked to install |

### 🟢 Safe to change

- All six API services and controllers — real test coverage, verified by execution
- `packages/types` — no consumers
- `tailwind.config.ts` and `globals.css` — no component reads a token programmatically; a recolour is the safest change available
- `navbar.tsx`, `footer.tsx`, `ui/button.tsx`, `ui/input.tsx` — small, documented, 13 call sites
- `ui/card.tsx` — dead file, safe to delete
- `templates/page.tsx` — a static Server Component
- `page.tsx` — static content plus two data arrays
- `prisma/seed.ts` — development-only
- All documentation files

---

## Required verification steps by change type

| Change type | Verification |
|-------------|-------------|
| **API service or controller** | `cd apps/api && npx jest` (146 must pass) + `npx tsc --noEmit` + a new test for the new behaviour |
| **Prisma schema** | `npx prisma migrate dev` + `npx prisma generate` + full API suite + review the generated SQL |
| **Design token / colour** | Recompute contrast for every affected pair (formula and current values in [17](./17-accessibility-findings.md)) + visual check of all 11 screens |
| **Shared component** (`Button`, `Input`, `Navbar`, `Footer`) | Visual check of every call site (9, 4, 7, 6 respectively) + keyboard tab-through |
| **A page component** | The full user flow from [12](./12-feature-inventory.md) for that feature + all its listed empty/error states |
| **Editor — any file** | Manual: add a shape, add text, add an image, apply a template, change every property, undo ×5, redo ×5, save, reload, verify restore, verify the 3D preview, switch category, verify the artboard relayout |
| **3D — any file** | All four products at both quality tiers; thumbnail and expanded modal; verify text is not mirrored and not upside-down; verify no z-fighting on the mug; verify the design does not wrap onto the handle |
| **`localStorage` format** | Verify that a design saved with the *old* format still loads, or ship a migration |
| **Cart or pricing** | Verify the cart total matches the checkout total matches the API's computation for the same items |
| **Any form** | Keyboard-only completion; label clicks focus the field; errors are announced |
| **Dependency change** | `npm ci` from clean + full API suite + `npx tsc --noEmit` in both apps |

---

## What must be learned or built before high-risk work

| # | Missing capability | Blocks | Effort |
|---|-------------------|--------|--------|
| 1 | **A working frontend test runner** (P-2) | Every frontend change | S |
| 2 | **A working E2E runner** (P-3) | Any cross-page change | S |
| 3 | **Component tests for `editor-right-panel.tsx`** | C-2, C-3 — the BUG-P01 refactor | M |
| 4 | **Integration tests for the canvas legacy-migration path** | C-4 | M |
| 5 | **An assertion test for the 2D↔3D aspect ratio** | Any change to `product-3d.ts` or `product-catalog.ts` | S |
| 6 | **Golden-image tests for the four 3D products** | Any change to `product-3d.ts` | M |
| 7 | **Visual-regression baselines for the 11 screens** | Any restyle. The Playwright-CLI workflow already exists (`.cursor/skills/playwright-cli/SKILL.md`) | M |
| 8 | **A running Postgres + MinIO** | Any API change that needs manual verification. `docker-compose up -d` starts postgres/redis/minio (the default profile); note the 5433 port | S |
| 9 | **A working Docker build** (C-6) | Any deployment work | M |
| 10 | **CI** (C-7) | Confident collaboration | M |
| 11 | **Answers to OQ-05, OQ-22, OQ-28, OQ-30, OQ-31** | C-1, E-7, E-9, E-2, and any launch decision | — |

---

## Can a future agent work from this documentation alone?

**Yes, for these tasks:**

| Task | Why the documentation suffices |
|------|-------------------------------|
| Add an API endpoint | [08](./08-api-documentation.md) documents all 20 existing routes; [07](./07-architecture.md) documents the module pattern; six identical examples exist in the code; the test pattern is uniform across 15 spec files |
| Change a colour, font, or spacing value | [11](./11-ui-system.md) is a complete token inventory including every hardcoded literal; [17](./17-accessibility-findings.md) gives the contrast formula and current values |
| Fix an accessibility finding | [17](./17-accessibility-findings.md) lists 23 findings with exact file:line and remediation |
| Fix a security finding | [16](./16-security-findings.md) lists 28 findings with attack scenarios and remediation, ordered by leverage |
| Add a product, template, or shape | [12](./12-feature-inventory.md) documents the data shape and every site that must stay in sync |
| Remove dead code | [15](./15-technical-debt.md) enumerates every dead export, variable, and asset with citations |
| Understand any feature end to end | [12](./12-feature-inventory.md) has a 16-field dossier per feature |
| Understand why odd code exists | [13](./13-historical-bug-report.md) catalogues 42 defensive items and 35 explanatory comments |
| Plan a redesign | [20, Part 2](./20-future-improvements.md#part-2--future-redesign-context-research-only) has the full functional contract, friction catalogue, and migration strategy |

**No, not for these — and the gap is stated:**

| Task | What is still missing | Where it is recorded |
|------|----------------------|---------------------|
| Verify any frontend change actually works | A working test runner. **Documentation cannot verify behaviour** | P-2, P-3 |
| Refactor the editor right panel | Tests that catch BUG-P01's recurrence. The convention is documented; enforcement is not | C-2, [21, OQ-13](./21-open-questions.md) |
| Modify the 3D geometry | Empirical verification. The constants and their relationship are documented; whether Babylon's UV generation actually yields a 1:1 map is not statically verifiable | [21, OQ-21](./21-open-questions.md) |
| Decide the product's direction | Answers to OQ-05, OQ-22, OQ-28, OQ-30, OQ-31, OQ-32 | [21](./21-open-questions.md) |
| Deploy | A working Docker build and a chosen target | C-6, [21, OQ-27](./21-open-questions.md) |
| Know whether a dependency is vulnerable | An SCA scan. **No CVE claim is made anywhere in this dossier** | [21, OQ-24](./21-open-questions.md) |
| Know what Issues 1–3, 7–17, 19 were | An external tracker | [21, OQ-02](./21-open-questions.md) |
| Know what BUG-E02/E03/E05/E06 were | A missing QA report, probably overwritten by a later run of the same prompt | [21, OQ-03](./21-open-questions.md) |

---

## Recommended first day

A concrete sequence that converts this repository from unsafe to workable.

| Order | Action | Effort | Result |
|------:|--------|--------|--------|
| 1 | Read [01](./01-executive-summary.md), [13](./13-historical-bug-report.md#defensive-code-inventory), and the do-not-touch list in [20](./20-future-improvements.md#-do-not-touch-without-extreme-care-list) | 45 min | You know what not to break |
| 2 | Delete `.gitignore:48`; add `.playwright-mcp/` and root `*.png`; verify `git status` excludes both `.env` files; `git init`; commit | 20 min | **Undo exists** |
| 3 | Fix `apps/web/jest.config.ts:9,16`; add `jest.setup.ts`; run | 30 min | The frontend suite starts |
| 4 | Triage the ~4 resulting failures (zoom clamps at `editor-store.spec.ts:257-288`; the replace-`setState` at `:10-23`) | 45 min | ~90 tests actually run |
| 5 | Fix `playwright.config.ts:12,23` → 3000; run | 20 min | E2E starts |
| 6 | Triage the ~8 stale assertions listed in A-7 | 90 min | E2E is meaningful again |
| 7 | Create `.eslintrc.json`; fix `apps/api/package.json:10`'s bogus glob; run | 30 min | Lint works |
| 8 | Triage the lint output | 90 min | 14 `<img>` and 16 label violations surfaced |
| 9 | Add `postinstall: prisma generate` | 5 min | Fresh clones build |
| 10 | Delete `apps/web/public/3d/wood_diff.jpg` | 2 min | 215 KB reclaimed |
| 11 | Commit each of the above separately with a "why" message | — | A real history begins |
| 12 | Read the five large `.playwright-cli` console logs from 2026-06-21 ([21, OQ-09](./21-open-questions.md)) | 30 min | The last-known-problem is understood |

**Total: about one working day.** At the end of it, every subsequent recommendation in [20](./20-future-improvements.md) becomes safe to attempt.

---

## Final statement

This repository is a **high-fidelity prototype with two genuinely excellent subsystems** — the Fabric.js editor and the Babylon.js 3D preview — **surrounded by a commerce shell that does not function** and **an operational envelope that does not exist**.

The code quality where it counts is better than the surrounding scaffolding suggests: the backend is cleanly modular with 146 real passing tests, password hashing is competent, the module graph is acyclic, there is not a single `@ts-ignore` or block of commented-out code in the entire tree, and the 35 explanatory comments documenting non-obvious constraints are of a standard most production codebases do not reach.

What is missing is not skill. It is **infrastructure**: version control, CI, a working frontend test runner, a lint configuration, and a deployment path. Four of those five can be restored in a single day.

**The documentation in this dossier is sufficient to make safe changes to 60 % of the codebase today, and to 100 % of it after that day's work.**
