# 21 — Open Questions

[← Index](./00-index.md)

Everything I could not determine from the artifacts available, why, what would resolve it, and who would need to answer.

**Format:** each item states the question, the evidence I *do* have, the specific blocker, the resolution path, and the owner.

---

## Category 1 — Questions no artifact in this repository can answer

These are blocked by the absence of version control, an issue tracker, and any human-authored decision record.

### OQ-01 — Who wrote this, and how many people?
**Evidence available:** stylistic uniformity across all 100 first-party files (double quotes throughout, identical module shape across all six API modules, a consistent comment voice), plus `.github/copilot-instructions.md` and `.cursor/skills/`, which indicate heavy AI-agent involvement.
**Blocker:** no `.git`, no `CODEOWNERS`, no `.mailmap`, no author field in any manifest, no name in any comment.
**Resolution:** ask the repository owner. Check the filesystem ACLs or the machine's user account (`AbdullahSaafan` appears in the workspace path, which is suggestive but not evidence of authorship).
**Owner:** project owner.
**Why it matters:** bus factor (R-05). If one person holds the `product-3d.ts` geometry knowledge, that is a continuity risk worth mitigating now.

### OQ-02 — What were Issues 1–3, 7–17, and 19?
**Evidence available:** `editor-right-panel.tsx` references "Issue 4" (`:677`), "Issue 5" (`:737`), "Issue 6" (`:756`), "Issue 18" (`:321`), and "Issue 20" (`:729`). The numbering implies a list of at least 20.
**Blocker:** no issue tracker exists in the repository. No `.github/ISSUE_TEMPLATE/`, no issues file, no report containing these numbers.
**Resolution:** locate the external tracker (GitHub Issues, Linear, Notion, a chat transcript) that these numbers refer to.
**Owner:** project owner.
**Why it matters:** fifteen documented defects whose root causes are unknown. Several may still be latent.

### OQ-03 — Where is the editor QA report containing BUG-E01 through BUG-E08?
**Evidence available:** `TEST_REPORT.md:69-74` cites BUG-E01, BUG-E04, BUG-E07, and BUG-E08 as "fix verified", implying a report with at least eight entries.
**Blocker:** that report is not in the tree. `QA_AUDIT_REPORT.md` covers BUG #1–#9 (a different series) and `TEST_REPORT.md` covers BUG-T01/T02/D01/D02/P01.
**Resolution:** find the missing document. `TEST_REPORT.md` was produced by `.github/prompts/deep-test-report.prompt.md`, which writes to `TEST_REPORT.md` — so the E-series report was probably **overwritten** by a later run of the same prompt.
**Owner:** project owner.
**Why it matters:** BUG-E02, E03, E05, and E06 are entirely unknown. My reconstruction of E01 and E04 in [13](./13-historical-bug-report.md#series-c--editor-bug-series-source-referenced-only-originating-report-absent) is inference from the fix, not from the report.

### OQ-04 — Why Babylon.js instead of Three.js?
**Evidence available:** `README.md:28` and `.github/copilot-instructions.md:172` both plan/claim Three.js + React Three Fiber + Drei. The implementation is Babylon.js 7.54.3 with 24 deep-path imports (`product-3d.ts:1-24`). Neither `three` nor any R3F package is a dependency. The `.playwright-cli/babylon-*.png` artifacts date to 2026-06-10, so the switch happened during the third development phase.
**Blocker:** no ADR, no commit message, no comment explaining the choice.
**Resolution:** ask the author. Plausible technical reasons visible in the code: Babylon's built-in `.env` prefiltered IBL support (`product-3d.ts:465`), `MeshBuilder.CreateLathe` for the mug profile (`:124`), and `DefaultRenderingPipeline` (`:559`) — all of which would need more assembly in Three.js.
**Owner:** original author.
**Why it matters:** it is the single largest undocumented architectural decision, and both "source of truth" documents still describe the abandoned option.

### OQ-05 — Was the disconnection from the API deliberate or unfinished?
**Evidence available:** `lib/api.ts:27-73` defines five complete, correct API namespaces with **zero importers**. All 20 backend endpoints are implemented and tested (146 passing tests). `products/[id]/page.tsx:16` says *"Mock data - in production this comes from API"*. `checkout/page.tsx:376` says *"Simulate order placement (backend may not be running)"*. `.github/copilot-instructions.md:78` says hardcoded data is used "for **some** pages" — it is all pages.
**Blocker:** no plan document, no migration ticket.
**Resolution:** ask whether the frontend was ever intended to connect, or whether the backend was built speculatively.
**Owner:** project owner.
**Why it matters:** it determines whether C-1 is "finish the work" or "a change of direction".

### OQ-06 — What was the "Brand" panel and why was it removed?
**Evidence available:** `TEST_REPORT.md:72` confirms BUG-E08 was "Brand colors persist to localStorage — fix verified". `e2e/user-journey.spec.ts:331-334` asserts `button[title="Brand"]` has count 0, under the test name *"29 - Brand tab removed; pan tool available"*. `editor-left-panel.tsx:29-37` now lists seven tabs with no Brand.
**Blocker:** no record of the removal decision.
**Resolution:** ask. Possible residue: `BackgroundsPanel`'s store-sync effect (`:494-497`) and the store's `backgroundColor` field.
**Owner:** original author.

### OQ-07 — What was the "safe zone indicator" / `print-guide`?
**Evidence available:** `editor-canvas.tsx:328-331` deletes objects with `id === "print-guide"` from restored designs. `e2e/user-journey.spec.ts:892` is named *"91 - Canvas renders with safe zone indicator"* but asserts only that the canvas is visible. `README.md:120` still advertises "Safe zones & bleed zones".
**Blocker:** no record.
**Resolution:** ask whether it was removed because the artboard now *is* the print area ("what you see is what prints" — `editor-artboard.ts:27`), which is the most likely explanation.
**Owner:** original author.

### OQ-08 — What was the "full-bleed page" artboard model?
**Evidence available:** `editor-canvas.tsx:119` — *"Remap content from a legacy full-bleed page or small centred artboard."* `.playwright-cli/fullbleed1.png` dated 2026-06-21 — the **final** development day.
**Blocker:** no record. The migration code implies at least three artboard generations.
**Resolution:** ask. Also determine **whether any user actually has a legacy design**, because that decides whether `migrateLegacyArtboard` (47 lines) can ever be deleted.
**Owner:** project owner.

### OQ-09 — What produced the 1.27 MB and 914 KB console logs on 2026-06-21?
**Evidence available:** `console-2026-06-21T14-15-51-927Z.log` (1,268,505 B), `T13-42-59` (914,592 B), `T14-38-22` (603,919 B), `T14-32-45` (378,057 B), `T14-44-04` (303,544 B) — five very large error bursts within 90 minutes on the last development day, concurrent with the print-area sizing work (`w1.png`, `h1.png`, `fix-s*.yml`).
**Blocker:** I catalogued but did not read these files (see the coverage statement in [02](./02-repository-overview.md#precisely-what-i-did-not-fully-read-and-why)).
**Resolution:** **read them.** This is the one open question fully answerable from artifacts already in the tree, and it may reveal an unfixed defect in the newest, least-tested subsystem.
**Owner:** anyone. **Recommended as an immediate follow-up.**

### OQ-10 — Why did development stop on 2026-06-21?
**Evidence available:** the last `.playwright-cli/` write is 2026-06-21 18:37; `package-lock.json` last changed 2026-06-10; nothing since.
**Blocker:** no record.
**Owner:** project owner.
**Why it matters:** determines whether this is abandoned, paused, or awaiting review — which changes the roadmap's framing entirely.

---

## Category 2 — Questions answerable only by running the system

I did not start the application, the database, or a production build.

### OQ-11 — Does `next build` succeed?
**Evidence:** `apps/web/.turbo/turbo-build.log` shows a build starting with a config warning and is **truncated at "Creating an optimized production build ..."** — it does not record an outcome. `npx tsc --noEmit` on the web app exits 2 with exactly one error, in `jest.config.ts` (which Next does not type-check).
**Concern:** `useSearchParams()` is used in client components without a `<Suspense>` boundary in `products/page.tsx:48`, `editor-canvas.tsx:52`, `editor-left-panel.tsx:100`, `editor-right-panel.tsx:209`, and `editor-3d-preview.tsx:106`. In Next 14 this produces a build-time warning and forces client-side rendering; under some configurations it is an error.
**Resolution:** run `npm run build --workspace=@my-lovely-gift/web`.

### OQ-12 — What is the actual bundle size?
**Blocker:** no bundle-analyser output exists; the `.next` directory contains mixed dev and prod artifacts.
**Resolution:** `next build` and read the route-size table; add `@next/bundle-analyzer`.
**Why it matters:** Babylon core + Fabric 6 in one route chunk is the central performance question ([18, PERF-02](./18-performance-findings.md)).

### OQ-13 — Do the ~90 web unit tests pass once the config is fixed?
**Evidence:** two are certain to fail — `editor-store.spec.ts:257-288` asserts zoom clamps of 0.1/5 while `editor-store.ts:109` clamps 0.25/3; and `:10-23` calls `setState(obj, true)` (replace) with an object that omits every action function, which by Zustand's replace semantics would destroy the store's methods for the rest of the file.
**Blocker:** `apps/web/jest.config.ts:9` prevents the suite from starting (verified).
**Resolution:** fix the config (A-6) and run.

### OQ-14 — How many E2E tests pass once the port is fixed?
**Evidence:** at least 8 assertions reference removed features or renamed strings ([13, BUG-LIVE-28](./13-historical-bug-report.md)). `user-journey.spec.ts` runs `serial` with a shared page, so an early failure cascades.
**Resolution:** fix `playwright.config.ts:12` and run.

### OQ-15 — Does `docker-compose up` work?
**Evidence of three blockers:** `Dockerfile.web:22` copies `.next/standalone`, which `next.config.js` never produces; `Dockerfile.api:5-6` runs `npm ci` in a context with no lockfile; MinIO and Medusa both bind host 9000.
**Resolution:** run `docker-compose --profile app up --build`.

### OQ-16 — Does the Medusa Compose service do anything?
**Evidence:** `docker-compose.yml:53-71` uses image `node:20-alpine` with no build, no volume, and no command — it would start a bare Node container and exit.
**Resolution:** run it. Then decide E-5.

### OQ-17 — What is the real 3D performance profile?
**Unknown:** frame rate at each tier, time-to-first-frame, texture-decode cost, memory footprint, and behaviour on a device that fails the tier heuristic.
**Resolution:** profile with the browser's performance panel and Babylon's inspector.

### OQ-18 — At what point does `localStorage` fail?
**Evidence:** cart items embed a full Fabric JSON **and** a base64 PNG thumbnail (`cart-store.ts:9-10`); design saves embed base64 uploads. No `setItem` anywhere is wrapped in try/catch.
**Resolution:** add several large uploaded images and observe. Likely `QuotaExceededError` at 5–10 MB with no user-visible error.

### OQ-19 — Does the checkout hydration flash actually produce a React error?
**Evidence:** `checkout/page.tsx` reads `items` and `totalPrice()` during the first render with no `mounted` guard, unlike the three components that have one.
**Resolution:** load `/checkout` with a populated cart and check the console.

### OQ-20 — Does the undo/redo race reproduce?
**Evidence:** `editor-store.ts:159-174` calls async `loadFromJSON` then synchronously moves the stack pointers. No in-flight guard.
**Resolution:** add several objects, then press Ctrl+Z rapidly and compare the canvas to the stack.

### OQ-21 — Does the mug artwork actually map 1:1?
**Evidence:** the arithmetic at `product-3d.ts:172-176` produces 2.934 and `ARTBOARD_SIZES.cup` is 1115/380 = 2.934. The maths is self-consistent.
**Blocker:** whether the *rendered* result is undistorted depends on Babylon's cylinder UV generation, which I cannot verify statically.
**Resolution:** apply a known grid texture and measure.

### OQ-22 — Do the seeded category dimensions matter at all?
**Evidence:** `seed.ts:22-104` seeds cup `800×400` with a `700×320` print area; `product-catalog.ts:20` uses `1115×380`. **Nothing reads the seeded values.** Similarly `validationRules.minDPI` / `maxFileSize` and all `pricingRules`.
**Question:** was the DB model intended to drive the editor (making `product-catalog.ts` a temporary stand-in), or is the seed data vestigial?
**Owner:** project owner. **This is architecturally significant** — it decides whether print geometry becomes tenant-configurable.

### OQ-23 — What happens with a real Medusa instance?
**Blocker:** `MedusaService` is implemented, mocked in tests, and never invoked by any route.
**Resolution:** run Medusa and call the service directly.

---

## Category 3 — Questions requiring information outside the codebase

### OQ-24 — Are any dependencies vulnerable?
**Blocker:** I did not run `npm audit` and did not contact any advisory service. 1,648 locked packages.
**Resolution:** `npm audit --json`, plus a proper SCA tool.
**Owner:** whoever runs CI. **I make no CVE claim anywhere in this dossier.**

### OQ-25 — What are the actual dependency licences?
**Blocker:** I read no `LICENSE` file from `node_modules`. The table in [05](./05-dependency-analysis.md#licence-obligations) records *conventional* licences and is explicitly marked unverified.
**Resolution:** `license-checker` or an SBOM tool. Particular attention to `@babylonjs/core` (Apache-2.0, NOTICE requirement) and `sharp` (bundles LGPL libvips) — though `sharp` is unused and should simply be removed.

### OQ-26 — Is this intended to be public, private, or open source?
**Evidence:** `README.md:151-153` says "Private - All rights reserved" but **no `LICENSE` file exists**. All three packages are `"private": true`.
**Owner:** project owner.

### OQ-27 — What is the intended deployment target?
**Evidence:** `next.config.js:4-15` allows `**.amazonaws.com` image hosts (suggesting AWS), Docker Compose exists (suggesting self-hosting), `.gitignore:33` ignores `.vercel` (suggesting Vercel was at least considered).
**Blocker:** no deployment configuration for any platform.
**Owner:** project owner. **Decides most of C-6.**

### OQ-28 — Is COPPA in scope?
**Evidence:** the product is explicitly positioned for "Gen Alpha" (`package.json:5`, `README.md:3`, `.github/copilot-instructions.md:43`) — a cohort substantially under 13. There is **no age gate, no parental-consent flow, and no age field** anywhere.
**Owner:** legal / product. **This is the single most consequential unanswered question for any public launch.**

### OQ-29 — Which browsers must be supported?
**Blocker:** no `browserslist`, no support matrix, no polyfill config. The hard floor is WebGL 2 (Babylon) and `crypto.randomUUID` (`cart-store.ts:35`) — the latter is **undefined on plain HTTP over a LAN IP**, which is exactly how a developer would test on a phone.
**Owner:** product.

### OQ-30 — What are the real print-production requirements?
**Evidence:** `seed.ts` carries `minDPI` of 150/200/300/300 per category and `maxFileSize` per category — **read by nothing**. Export is a fixed 2× PNG (`editor-toolbar.tsx:78`) with no DPI control, no CMYK, no bleed, and no PDF.
**Owner:** the print fulfilment partner. **Decides E-9 entirely.**

### OQ-31 — Which payment processor?
**Evidence:** `checkout/page.tsx:29-34` collects raw card fields with no processor SDK. `orders.paymentMethod` (`schema.prisma:223`) is never written. Medusa's payment capability is unwired.
**Owner:** product/finance. **Decides E-2 and the PCI question.**

### OQ-32 — Is multi-tenancy a real requirement or aspirational?
**Evidence for real:** `tenantId` on 5 tables with compound unique indexes; `x-tenant-id` on 12 endpoints; a `Tenant` model with `domain` and `settings`.
**Evidence for aspirational:** `NEXT_PUBLIC_TENANT_ID` is baked in at build time (one tenant per build); `Design` has no `tenantId`; three endpoints are unscoped; there is no tenant-management UI; the seed creates exactly one tenant.
**Owner:** product. **Decides E-7's priority.**

### OQ-33 — Is there a design partner, or is the ui-ux-pro-max toolkit the whole design process?
**Evidence:** `design-system/mylovelygift/MASTER.md` was generated on 2026-05-30 and then **ignored** — the implemented palette differs completely. No Figma link, no design file, no mockup exists.
**Owner:** product/design. **Decides whether Phase 7 is "restyle to match a design" or "design from scratch".**

---

## Category 4 — Ambiguities in the code I could not resolve by reading

### OQ-34 — Why `100` ms and `60` ms specifically?
**Evidence:** `editor-canvas.tsx:145` and `editor-3d-preview.tsx:65`. The *reason* for the 60 ms delay is documented (React StrictMode); the *value* is not. The 100 ms delay has no explanation at all.
**Resolution:** replace the 100 ms timer with a `ResizeObserver` (the observer already exists 170 lines later at `:318`) and empirically determine the Babylon minimum.

### OQ-35 — Is the layers subsystem dead by design or by oversight?
**Evidence:** `editor-store.ts:9-16,21,36-41,84-107` defines a full layer API. Nothing calls it. `LayersPanel` (`editor-left-panel.tsx:588-671`) reads `canvas.getObjects()` directly. Ten tests cover the dead API (`editor-store.spec.ts:119-247`).
**Question:** was the store API written first and abandoned, or is `LayersPanel` a temporary shortcut?
**Owner:** original author. **Decides B-9 (delete) versus a refactor (adopt).**

### OQ-36 — Why does `getArtboardBounds` accept and discard `category`?
**Evidence:** `editor-artboard.ts:28-32` — `void category;` on line 32, with 9 call sites passing it.
**Hypothesis (medium confidence):** bounds were once category-dependent and became artboard-derived when the artboard *became* the print area. The parameter survives for call-site compatibility.
**Resolution:** ask, or simply remove it and see what breaks (with tests in place).

### OQ-37 — Is `rightPanelOpen` a planned feature or dead state?
**Evidence:** `editor-store.ts:29,45` defines it; `editor/[productId]/page.tsx:15,35` reads it; **nothing writes it**. There is no toggle in the UI.
**Question:** was a collapse button planned and cut?
**Owner:** original author.

### OQ-38 — Is `CartStore.isOpen` / `toggleCart` a planned slide-out drawer?
**Evidence:** `cart-store.ts:17,23,60` — neither read nor called. `partialize` deliberately excludes `isOpen` from persistence (`:67`), which implies someone thought about its lifecycle.
**Owner:** original author.

### OQ-39 — Why do `products/[id]` template tiles emit `t1`–`t4`?
**Evidence:** `products/[id]/page.tsx:33-37,251` emit `?template=t1..t4`; `editor-templates.ts` uses semantic ids (`birthday-cup`, `sports-tee`). The editor's existence check (`editor-left-panel.tsx:124`) therefore never matches.
**Question:** was this written before BUG-T02's fix established the id vocabulary, and never reconciled?
**Resolution:** map them to real ids or remove the tiles (D-10).

### OQ-40 — Was `packages/types` ever imported?
**Evidence:** zero importers. It has no dependencies declared and no `scripts`, yet it has a working `jest.config.ts` and 17 passing tests. Someone invested real effort.
**Question:** was it imported and then backed out, or never adopted?
**Owner:** original author. **Decides C-9.**

---

## Summary

| Category | Count | Resolvable by |
|----------|------:|---------------|
| 1 — No artifact can answer | 10 | The project owner / original author |
| 2 — Requires running the system | 13 | Anyone with the repo and Docker |
| 3 — Requires external information | 10 | Product, legal, and business stakeholders |
| 4 — Code ambiguities | 7 | The original author, or empirically |
| **Total** | **40** | |

### The three questions worth answering first

1. **OQ-09 — read the five large console logs from 2026-06-21.** This is the only open question fully answerable from artifacts already in the tree, it costs minutes, and it concerns the newest and least-tested subsystem on the last day anyone worked on it. It may surface an unfixed defect.
2. **OQ-28 — is COPPA in scope?** It is the only question that could block a launch outright, and it has no technical workaround.
3. **OQ-05 — was the API disconnection deliberate?** It determines whether the single largest roadmap item (C-1) is finishing work or changing direction, and therefore how the whole roadmap should be framed.
