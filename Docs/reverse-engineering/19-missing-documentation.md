# 19 — Missing Documentation

[← Index](./00-index.md)

Two halves: (A) documentation that exists but is wrong, and (B) documentation that should exist and does not.

---

## A. Existing documentation, accuracy-audited

### A.1 Inventory

| Document | Lines / bytes | Purpose | Verdict |
|----------|--------------:|---------|---------|
| `README.md` | 153 / 4,363 | Project overview | ⚠️ **Partially stale** — 6 inaccuracies |
| `.github/copilot-instructions.md` | 1,135 / 40,104 | "Single source of truth for all AI agents" | ❌ **Substantially inaccurate** — ~19 inaccuracies |
| `QA_AUDIT_REPORT.md` | 134 / 6,245 | 9 defects: root cause, fix, verification | ⚠️ **Historically valuable, 3 verifications no longer hold** |
| `TEST_REPORT.md` | 159 / 8,997 | 5 defects + a fix-verification table | ⚠️ **Historically valuable, 2 statements no longer hold** |
| `design-system/mylovelygift/MASTER.md` | 204 / 5,375 | Generated design tokens | ❌ **Contradicts the implementation entirely** |
| `.cursor/rules/browser-testing.mdc` | 19 / 632 | Browser-testing rule for agents | ⚠️ One port inaccuracy |
| `.cursor/skills/playwright-cli/SKILL.md` | 59 / 2,333 | Playwright-CLI workflow | ✅ **Accurate** |
| `.github/prompts/deep-test-report.prompt.md` | 238 / 11,165 | The QA-agent prompt | ⚠️ File list is a 2026-06-01 snapshot; port is 3001 |
| `.github/prompts/ui-ux-pro-max/PROMPT.md` | 289 / 10,535 | Vendored toolkit docs | ✅ Accurate for the toolkit |
| Swagger at `/api/docs` | generated | API reference | ⚠️ Routes and summaries only — no schemas, no headers |
| Inline code comments | 35 substantive | Constraint documentation | ✅ **Excellent — the best documentation in the repository** |

### A.2 `README.md` — inaccuracies

| Line | Claim | Reality |
|-----:|-------|---------|
| 28 | "3D (future) — Three.js + React Three Fiber" | 3D is **shipped**, using **Babylon.js 7.54.3** (`apps/web/package.json:14`; `product-3d.ts:1-24`). Neither `three` nor `@react-three/fiber` is a dependency |
| 56-57 | `packages/shared/` and `packages/editor/` | Neither directory exists |
| 89 | `npx prisma migrate dev --name init` | The migration already exists (`20260530232216_init`); re-running with the same name is confusing. Also `.gitignore:48` excludes the directory |
| 103 | "Visit `http://localhost:3000`" | Correct for `npm run dev:web` ✅, but `playwright.config.ts:12` and `deep-test-report.prompt.md:48` both say 3001 |
| 112 | "Smart alignment & snap guides" | Snapping exists (centre-only, `editor-canvas.tsx:221-235`) but there are **no visual guides** |
| 109 | "Layer management (lock, hide, reorder, group)" | Lock ✅, hide ✅, reorder only via the right panel's Forward/Back, **group does not exist** |
| 119 | "Template marketplace (Global, Merchant, Shared, Private)" | The `TemplateVisibility` enum exists (`schema.prisma:167-172`) but **no UI and no marketplace** |
| 120 | "Safe zones & bleed zones" | Removed — see the `print-guide` cleanup at `editor-canvas.tsx:328-331` |
| 124-127 | "Cart & checkout flow / Order management / MedusaJS commerce integration" | Checkout is simulated (`checkout/page.tsx:377`); order management has no UI; Medusa is never called |
| 133 | "Redis caching" | Redis runs; **nothing connects to it** |
| 142 | "Asset pipeline: Presigned S3 uploads → async processing" | The presign endpoint exists and is **never called**; there is no async processing |
| 75 | `cp .env.example .env` | Produces a **non-working** `DATABASE_URL` (port 5432 vs the published 5433) |

### A.3 `.github/copilot-instructions.md` — inaccuracies

This file declares itself the *"Single source of truth for all AI agents working on this repository"* (`:3`) and instructs agents to *"Read this file completely before making any changes"* (`:1008`). It is the most dangerous stale document in the tree.

| Line | Claim | Reality |
|-----:|-------|---------|
| 39 | Products include "phone cases, tote bags" | Only cup, t-shirt, sticker, badge |
| 59, 172 | "Three.js real-time product preview" / "Three.js + R3F + Drei 0.167.x" | Babylon.js 7.54.3 |
| 78 | "Frontend currently uses hardcoded product data for **some** pages" | **All** pages. Zero product/template/design/order API calls exist |
| 213 | "CI/CD: GitHub Actions (planned)" | Correct that it is planned; `:1134` then points readers at a non-existent `.github/workflows/` |
| 234 | `apps/api/src/config/` | Does not exist |
| 249 | `apps/web/src/app/api/` | Does not exist |
| 253-254 | `components/shop/`, `components/templates/` | Do not exist |
| 264-265 | `packages/editor/`, `packages/shared/` | Do not exist |
| 316 | "API endpoints: kebab-case plural nouns — `/api/v1/design-templates`" | No such endpoint. The real path is `/templates/designs/:categoryId` |
| 390 | "Never read URL params with hardcoded parsing. Always use `useSearchParams()`" | Violated at `editor-toolbar.tsx:69` (`new URLSearchParams(window.location.search)`) |
| 394-406 | Prescribes a `useQuery` + `productsApi` pattern | **No file follows it.** Zero `useQuery` calls exist |
| 445 | `dto/` directories | None exist. Zero DTO classes |
| 446 | Tests colocated as `[feature].service.spec.ts` | Tests live in `apps/api/tests/unit/**` |
| 487-490 | "Use `class-validator` decorators on DTOs / All user input MUST be validated" | Zero decorators; the global pipe is inert |
| 500 | "Use NestJS `Logger` (not `console.log`)" | No `Logger` anywhere; `main.ts:43-44` uses `console.log` |
| 527-529 | Index all FKs and `status` | No such index exists in `migration.sql:211-238` |
| 582-589 | List responses use `{ data, total, limit, offset }` | `products.service.ts:47` returns `{ products, total }` |
| 603 | "Maximum limit: 100" | Not enforced |
| 608-610 | "Bearer token in `Authorization` header … validated server-side" | Never read, never validated |
| 673 | "Use `express-rate-limit` (**already configured**)" | **Not imported anywhere** |
| 691 | "Only `FINALIZED` designs can be added to orders" | No such check in `orders.service.ts` |
| 704-706 | Order status lifecycle with cancellation rules | No state machine; `updateStatus` casts with `as any` and has no route |
| 728-729 | "Never use floating point for money" / "`Intl.NumberFormat`" | Both violated (`orders.service.ts:47-53`; `.toFixed(2)` in 12 places) |
| 745 | Tests colocated | They are not |
| 781 | "Mock Prisma with `jest-mock-extended`" | Not a dependency; a hand-rolled mock is used |
| 800 | Playwright `baseURL: http://localhost:3001` | Accurately describes the config — which is itself wrong relative to `dev:web` |
| 900 | "Architecture decisions: `docs/adr/`" | Does not exist |
| 920, 926 | Redis caching and Bull queues | Neither module is registered |
| 927-928 | "`React.lazy()` + `Suspense`" and "Lazy-load heavy components" | Zero occurrences |
| 941 | "Skip navigation link" | Does not exist |
| 943 | "Touch targets ≥ 44×44px" | Multiple 16 px and 28 px targets |
| 958-961 | Structured logging with correlation IDs | No logging |
| 965 | "NestJS exception filters" | None |
| 972 | "`/health` endpoint" | Does not exist |
| 973 | "Docker healthcheck configured for all services" | Configured for postgres, redis, and minio only — **not** for `api` or `web` (`docker-compose.yml:74-114`) |

**Count: ~35 individual inaccuracies.** Sections 1–9 (overview through API standards) are broadly directionally right. Sections 10–18 (security, business rules, testing, performance, accessibility, observability) describe **an aspirational system, not this one.**

### A.4 `QA_AUDIT_REPORT.md` — accuracy of its verifications

| Bug | Report says | Reality today |
|-----|------------|---------------|
| #1 | "✅ `/products?category=cups` now shows only Cups & Mugs" | Works, but the regression test asserts a tab label of `/Cups\|Mugs/i` while the code renders `"Cup"` — the test fails |
| #5 | "✅ `/products/3` shows 'Cotton Tee'" | The product is now named `"Classic Cotton Tee"` (`products/[id]/page.tsx:63`). **The verification statement and its regression test are both stale** |
| #6 | "✅ 'Full name is required' shown when clicking Continue with empty form" | The form now has **First Name / Last Name**; the message is `"First name is required"` (`checkout/page.tsx:38`). **Stale** |
| #9 | "✅ `#login-email` and `#login-password` exist and are associated" | True for login. **16 labels elsewhere remain unassociated** |
| Line 124 | "All bugs have corresponding tests in `e2e/bug-regression.spec.ts`" | True, but **the suite cannot run** (port) and 3 of the 9 tests would fail |

**Value assessment:** despite the drift, this is the **single most valuable historical document in the repository**. It records root causes, not just symptoms.

### A.5 `TEST_REPORT.md` — accuracy

| Statement | Reality |
|-----------|---------|
| `:40` — "'Edit Design' link ✅ PASS — Navigates to `/editor/{id}` and loads saved design" | **False today.** The save key gained a `-${category}` suffix afterwards; the link now always opens a blank canvas. See [09](./09-navigation.md#the-broken-edit-design-link) |
| `:41,43` — BUG-D01 and BUG-D02 marked FAIL | **Both fixed** (`my-designs/page.tsx:142-164,46-50`) |
| `:50-55` — BUG-P01 marked FAIL across 7 controls | **Fixed** (`editor-right-panel.tsx` — manual event firing + local shadow state) |
| `:25-26` — BUG-T01, BUG-T02 marked FAIL | **Both fixed** |
| `:4` — "Environment: localhost:3001" | Contradicts `QA_AUDIT_REPORT.md:6` ("localhost:3000") |
| `:69-74` — references BUG-E01/E04/E07/E08 | **The report containing those bugs is not in this repository** |

### A.6 `design-system/mylovelygift/MASTER.md` — contradicts the implementation

| Token | MASTER.md | Implementation |
|-------|-----------|----------------|
| Primary | `#6366F1` (`:21`) | `#7C3AED` (`tailwind.config.ts:25`) |
| Secondary | `#818CF8` (`:22`) | `#06B6D4` (`:39`) |
| CTA/Accent | `#22C55E` (`:23`) | `#F97316` (`:53`) |
| Background | `#EEF2FF` (`:24`) | `hsl(270 100% 99%)` = `#FCFAFF` (`globals.css:10`) |
| Text | `#312E81` (`:25`) | `hsl(270 50% 10%)` = `#1A0D26` (`globals.css:11`) |
| Spacing tokens | 7 defined (`:45-51`) | **None exist** |
| Shadow tokens | 4 defined (`:57-60`) | **None exist** |
| Button radius | `8px` (`:74`) | `rounded-xl` = 12 px (`button.tsx:7`) |
| Card background | `#EEF2FF` (`:102`) | `bg-white` (`globals.css:50`) |
| Category | "Generative Art Platform" (`:11`) | An e-commerce customisation platform |
| Page pattern | "Marketplace / Directory" with a hero search bar as the primary CTA (`:166-170`) | The hero CTA is "Start Designing"; search is a small navbar field |
| Font families | Rubik + Nunito Sans (`:31-32`) | ✅ **The one thing that matches** |
| `:181` | "❌ Emojis as icons — forbidden" | Emojis used as icons in 6+ places |
| `:184` | "❌ Low contrast text — maintain 4.5:1" | 9 failing pairs — see [17](./17-accessibility-findings.md) |
| `:200` | "`prefers-reduced-motion` respected" | Not implemented |
| `:201` | "Responsive: 375px, 768px, 1024px, 1440px" | The editor is unusable below ~812 px |
| `:3` | "check `design-system/pages/[page-name].md` first" | That directory does not exist |

**Verdict: actively harmful.** A designer or agent following this file would build the wrong product in the wrong colours.

### A.7 `.cursor/rules/browser-testing.mdc`

`:12` says `npm run dev:web` → `http://localhost:3000` ✅ (matches `apps/web/package.json:6`). This **contradicts** `playwright.config.ts:12` (3001) and `deep-test-report.prompt.md:48` (3001). One of the three is right; the rule file is the one that matches the code.

### A.8 Swagger / OpenAPI

Generated at `/api/docs` from decorators. **Present:** `@ApiTags` on all 6 controllers, `@ApiOperation` on all 20 routes, `@ApiQuery` on the 4 products query params (`products.controller.ts:22-25`), and `addBearerAuth()` (`main.ts:36`).

**Missing:** every `@ApiResponse` (so no response schema is published), every `@ApiHeader` (so `x-tenant-id` and `x-user-id` — which every endpoint depends on — are invisible), every `@ApiBody` schema, every `@ApiParam` description. The advertised bearer auth is not enforced. There is no exported `openapi.json`, no Postman collection, and no client generation.

---

## B. Documentation that should exist and does not

### B.1 Standard repository files — all absent

| File | Why it matters |
|------|----------------|
| `LICENSE` | `README.md:151-153` asserts "Private - All rights reserved" with no licence file |
| `CONTRIBUTING.md` | No onboarding, no branch strategy, no review process |
| `CODE_OF_CONDUCT.md` | — |
| `SECURITY.md` | No vulnerability-disclosure path, for a project with 4 critical findings |
| `CHANGELOG.md` | No release history (and no releases) |
| `ARCHITECTURE.md` | Architecture is described only inside the AI-instructions file |
| `docs/adr/` | Referenced at `.github/copilot-instructions.md:900`; does not exist. **No decision is recorded anywhere** — most importantly, why Babylon.js replaced Three.js |
| `.editorconfig` | Formatting is consistent by habit, enforced by nothing |
| `.nvmrc` / `.tool-versions` | Node version is only in `engines` |
| `.eslintrc.json` | **The single highest-value missing file** — `eslint-config-next` with `jsx-a11y` and `react-hooks` is installed and completely inert |
| `.prettierrc` | — |
| `.github/workflows/*.yml` | No CI |
| `.github/PULL_REQUEST_TEMPLATE.md` | `.github/copilot-instructions.md:852-875` defines a PR standard with no template |
| `.github/ISSUE_TEMPLATE/` | The code references "Issue 4/5/6/18/20" from a tracker that does not exist |
| `.dockerignore` | Docker builds copy `node_modules` and `.next` into the build context |
| `apps/web/jest.setup.ts` | Needed for `@testing-library/jest-dom` |

### B.2 Undocumented technical knowledge, ranked by how expensive it would be to rediscover

| Rank | Knowledge | Where it lives now | Why it must be written down |
|-----:|-----------|-------------------|----------------------------|
| **1** | **The 2D↔3D mug aspect-ratio contract** — `ARTBOARD_SIZES.cup` (1115×380 = 2.934) must equal the mug's arc-length ÷ band-height, derived from `MUG_3D_PRINT` | A comment at `product-3d.ts:167-177` and a second at `product-print-limits.ts:5-8` | Two files, one invariant, **no test**. Breaking it produces visibly stretched artwork that no automated check catches. This is the highest-value undocumented invariant in the project |
| **2** | **BUG-P01's fix is a convention, not a mechanism** — every programmatic Fabric `.set()` must be followed by `canvas.fire("object:modified", …)` | 10 call sites; the reason is only in `TEST_REPORT.md:108-137` | A new contributor adding a control will not know this and will silently reintroduce the bug |
| **3** | **The 42 pieces of defensive code** catalogued in [13](./13-historical-bug-report.md#defensive-code-inventory) | 35 inline comments cover most of them; 7 have none | Any "cleanup" refactor will remove them |
| **4** | **Why Babylon.js and not Three.js** | Nowhere. Both `README.md:28` and `copilot-instructions.md:172` still say Three.js | A future team will not know whether the choice was deliberate |
| **5** | **The `localStorage` key schema** — `design-{productId}-{category}`, `print-dims-{productId}-{category}`, `cart-storage`, `auth_token`, `user_id`, `user_email` | Implicit across 6 files; already divergent | This is a persisted data format. It needs a written spec and a version field |
| **6** | **Which parts of the app are real vs. mocked** | Only two inline comments (`products/[id]/page.tsx:16`, `checkout/page.tsx:376`) | The dominant misconception a newcomer will form |
| **7** | **The quality-tier heuristic** — mobile UA ∨ cores ≤ 4 ∨ memory ≤ 4 → low | `editor-3d-preview.tsx:16-23` | Thresholds are unjustified and untestable |
| **8** | **The artboard layout algorithm** — landscape fills width, portrait fills height, 32 px margin | `editor-artboard.ts:47-52` comment | Central to how the editor looks on every screen size |
| **9** | **Fabric JSON is the persisted format in four places** | Nowhere | Determines the blast radius of any Fabric upgrade |
| **10** | **The tenancy model's actual guarantees** — schema-level yes, runtime-level no; `Design` has no `tenantId` | Nowhere | Security-relevant |
| **11** | Local development setup gotchas — port 5433 vs 5432, `prisma generate` before build, MinIO/Medusa port collision | Nowhere | Every new developer hits all three |
| **12** | The three artificial delays (100 ms / 60 ms / 400 ms) and why each exists | Two of three are commented | The 100 ms canvas delay has no explanation |
| **13** | Environment-variable reference — purpose, required/optional, defaults | `.env.example` lists 15 keys with no annotations | See B.3 |

### B.3 Environment-variable reference (does not exist — supplied here)

| Variable | Where read | Required | Default | Purpose |
|----------|-----------|:--------:|---------|---------|
| `NODE_ENV` | Node/Next convention | No | `development` | Runtime mode |
| `DATABASE_URL` | `schema.prisma:7` | **Yes** | none | Postgres DSN. **Use port 5433 locally** (`docker-compose.yml:11`), not the 5432 in `.env.example:5` |
| `REDIS_URL` | Set in `.env`; **read by nothing** | No | — | Dead |
| `MEDUSA_URL` | `medusa.service.ts:11` | No | `http://localhost:9000` | Medusa base URL. **Collides with `S3_ENDPOINT`** |
| `JWT_SECRET` | `auth.service.ts:117` | **Should be** | ⚠️ `"dev-secret-key"` — a value published in this repository | HMAC signing key. **Remove the fallback** |
| `COOKIE_SECRET` | Set in `.env`; **read by nothing** | No | — | Dead — no cookies are used |
| `S3_ENDPOINT` | `assets.service.ts:24` | **Yes** for uploads | none | MinIO/S3 endpoint |
| `AWS_REGION` | `assets.service.ts:23` | No | `us-east-1` | |
| `AWS_ACCESS_KEY_ID` | `assets.service.ts:26` | **Yes** for uploads | `""` | |
| `AWS_SECRET_ACCESS_KEY` | `assets.service.ts:27` | **Yes** for uploads | `""` | |
| `S3_BUCKET` | `assets.service.ts:31` | No | `my-lovely-gift-assets` | |
| `CDN_URL` | `assets.service.ts:47,59` | **Yes** for correct public URLs | `""` | Prefix for asset URLs |
| `PORT` | `main.ts:41` | No | `4000` | API listen port |
| `FRONTEND_URL` | `main.ts:15` | No | `http://localhost:3000` | CORS origin allow-list (single origin only) |
| `NEXT_PUBLIC_API_URL` | `lib/api.ts:3` | No | `http://localhost:4000/api/v1` | **Baked in at build time** |
| `NEXT_PUBLIC_TENANT_ID` | `lib/api.ts:4` | No | `default` | **Baked in at build time — one tenant per build** |
| `DB_PASSWORD` | `docker-compose.yml:8,59,80` | No | `localdev123` | Compose only |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | `docker-compose.yml:39-40,84-85` | No | `minioadmin` / `minioadmin123` | Compose only |
| `CI` | `playwright.config.ts:6-7` | No | unset | Enables `forbidOnly` and 2 retries |

**No variable is validated at startup.** There is no `envSchema`, no `ConfigModule.forRoot({ validationSchema })`, and no boot-time assertion. A missing `DATABASE_URL` fails at the first query; a missing `JWT_SECRET` silently uses the published fallback.

### B.4 Missing per-domain documentation

| Domain | Gap |
|--------|-----|
| **API** | No response schemas, no header documentation, no error catalogue, no rate-limit or auth documentation, no exported OpenAPI JSON, no Postman collection |
| **Database** | No ER diagram outside this dossier, no seed-data documentation, no index rationale, no migration runbook, no backup/restore procedure |
| **Frontend** | No Storybook, no component API docs (the `Button` and `Input` reference in [11](./11-ui-system.md#shared-component-api-reference) is the first), no state-management guide, no routing map |
| **Editor** | No user-facing help, no keyboard-shortcut reference (7 shortcuts exist and are documented only in `title` attributes), no explanation of the artboard model |
| **3D** | No documentation of the geometry-constant contract, the quality tiers, the asset requirements, or the browser requirements |
| **Deployment** | No runbook, no environment matrix, no rollback procedure, no smoke-test checklist |
| **Testing** | No strategy document, no coverage targets, no instructions for running the E2E suite (which cannot currently run) |
| **Security** | No threat model, no `SECURITY.md`, no data-classification, no secret-rotation procedure |
| **Onboarding** | `README.md:63-101` is the only guide; following it literally produces a broken database connection |

---

## Prioritised documentation actions

| # | Action | Effort | Why now |
|---|--------|--------|---------|
| 1 | Add a prominent "**Current state: prototype**" banner to `README.md` listing what is real vs. mocked | S | Prevents the single most costly misconception |
| 2 | Correct the ~35 inaccuracies in `.github/copilot-instructions.md`, or gate it behind a "verify before trusting" header | M | It is explicitly instructed to be trusted by AI agents |
| 3 | Regenerate or delete `design-system/mylovelygift/MASTER.md` | S | Actively misleading on colour, spacing, and shadow |
| 4 | Write an ADR for the Three.js → Babylon.js decision | S | Highest-value single decision record |
| 5 | Write `docs/invariants.md` covering the 2D↔3D contract, the BUG-P01 convention, and the `localStorage` key schema | M | The three things most expensive to rediscover |
| 6 | Add the environment-variable reference (B.3) to the README | S | Fixes the broken onboarding path |
| 7 | Add `@ApiResponse`, `@ApiHeader`, and `@ApiBody` to all 20 endpoints | M | Makes Swagger genuinely useful |
| 8 | Add a `SECURITY.md` and a `LICENSE` | S | Standard hygiene |
| 9 | Fix the port contradiction across `playwright.config.ts`, `deep-test-report.prompt.md`, and `browser-testing.mdc` | S | Unblocks E2E |
| 10 | Update `QA_AUDIT_REPORT.md` and `TEST_REPORT.md` with a "superseded" note rather than editing them — they are historical records | S | Preserves provenance while flagging drift |
| 11 | Write a keyboard-shortcut reference and surface it in the editor | S | Seven shortcuts are effectively hidden |
| 12 | Write `CONTRIBUTING.md` once git exists | M | — |
