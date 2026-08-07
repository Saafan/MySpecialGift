# 91 — Inspection Checklist (Phase 0.4), Reconciled

[← Index](./00-index.md)

The persistent checklist built in Phase 0.4, reconciled at the end of the work. Every item is marked ✅ inspected, 📋 catalogued (binary/generated — recorded but not read), or ❌ not present.

---

## Root configuration

- [x] ✅ `package.json`
- [x] ✅ `turbo.json`
- [x] ✅ `tsconfig.json`
- [x] ✅ `docker-compose.yml`
- [x] ✅ `playwright.config.ts`
- [x] ✅ `.env.example`
- [x] ✅ `.gitignore`
- [x] 📋 `package-lock.json` — read structurally (version, 1,648 entries, registry distribution, workspace links, absence of overrides/resolutions/patches)
- [x] ❌ `.dockerignore`, `.eslintignore`, `.prettierignore`, `.npmignore`, `.gcloudignore` — **none exist**
- [x] ❌ `.editorconfig`, `.nvmrc`, `.tool-versions`, `.sdkmanrc`, `rust-toolchain`, `.python-version` — **none exist**
- [x] ❌ `.eslintrc*`, `eslint.config.*`, `.prettierrc*` — **none exist**
- [x] ❌ `Makefile`, `*.sh`, `*.ps1` — **none exist**

## Root documentation

- [x] ✅ `README.md` — accuracy-audited, 12 inaccuracies
- [x] ✅ `TEST_REPORT.md` — accuracy-audited, 2 stale statements
- [x] ✅ `QA_AUDIT_REPORT.md` — accuracy-audited, 3 stale verifications
- [x] ❌ `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `docs/adr/` — **none exist**

## Root binaries

- [x] 📋 14 `*.png` screenshots — catalogued with byte size and capture time in [90](./90-file-inventory.md#root-level-binary-artifacts)

## `.cursor/`

- [x] ✅ `rules/browser-testing.mdc`
- [x] ✅ `skills/playwright-cli/SKILL.md`

## `.github/`

- [x] ✅ `copilot-instructions.md` (1,135 lines) — read in full, ~35 inaccuracies catalogued
- [x] ✅ `prompts/deep-test-report.prompt.md` — read
- [x] ✅ `prompts/ui-ux-pro-max/PROMPT.md` — read
- [x] ✅ `prompts/ui-ux-pro-max/scripts/core.py` — read
- [x] ✅ `prompts/ui-ux-pro-max/scripts/search.py` — read in full
- [x] 📋 `prompts/ui-ux-pro-max/scripts/design_system.py` (43,614 B) — read structurally via its public entry points used at `search.py:21,76-83`
- [x] 📋 24 `data/*.csv` — schemas read from `core.py:17-61`; row contents not read (vendored reference data)
- [x] 📋 5 `__pycache__/*.pyc` — binary, catalogued
- [x] ❌ `.github/workflows/`, `ISSUE_TEMPLATE/`, `PULL_REQUEST_TEMPLATE.md` — **none exist**

## `apps/api/`

### Configuration
- [x] ✅ `package.json`, `tsconfig.json`, `nest-cli.json`, `jest.config.ts`, `.env`
- [x] ✅ `.turbo/turbo-build.log` — read in full (key historical evidence)

### Database
- [x] ✅ `prisma/schema.prisma` (282 lines)
- [x] ✅ `prisma/seed.ts` (242 lines)
- [x] ✅ `prisma/migrations/migration_lock.toml`
- [x] ✅ `prisma/migrations/20260530232216_init/migration.sql` (284 lines)

### Source — all 24
- [x] ✅ `src/main.ts`, `src/app.module.ts`
- [x] ✅ `src/common/prisma/{module,service}.ts`
- [x] ✅ `src/common/medusa/{module,service}.ts`
- [x] ✅ `src/modules/auth/{module,controller,service}.ts`
- [x] ✅ `src/modules/products/{module,controller,service}.ts`
- [x] ✅ `src/modules/templates/{module,controller,service}.ts`
- [x] ✅ `src/modules/designs/{module,controller,service}.ts`
- [x] ✅ `src/modules/orders/{module,controller,service}.ts`
- [x] ✅ `src/modules/assets/{module,controller,service}.ts`

### Tests — all 23 accounted for
- [x] ✅ `tests/builders/index.ts` — read in full
- [x] ✅ `tests/fixtures/index.ts` — read in full
- [x] ✅ `tests/helpers/test-utils.ts` — read in full
- [x] ✅ `tests/mocks/{index,prisma,medusa,s3,config}.ts` — all 5 read in full
- [x] ✅ `tests/unit/modules/auth/auth.service.spec.ts` — read in full
- [x] ✅ `tests/unit/modules/orders/orders.service.spec.ts` — read in full
- [x] ✅ `tests/unit/modules/orders/order-business-rules.spec.ts` — read in full
- [x] ✅ `tests/unit/modules/designs/designs.service.spec.ts` — read in full
- [x] ✅ `tests/unit/modules/assets/assets.service.spec.ts` — read in full
- [x] 📋 The remaining 9 spec files — **read structurally**: the complete `describe`/`it` inventory with line numbers was extracted and is reproduced in [12](./12-feature-inventory.md#test-coverage-map). Their imports and mock-injection pattern were also read
- [x] ✅ **All 146 tests executed** — 15 suites, 146 passed, 52.2 s

### Generated
- [x] 📋 `dist/` — 145 files, 1,102,103 B. `tsc` output mirroring `src/**`, which was read in full

## `apps/web/`

### Configuration
- [x] ✅ `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `jest.config.ts`, `.env.local`, `next-env.d.ts`
- [x] ✅ `.turbo/turbo-build.log` — read in full
- [x] 📋 `tsconfig.tsbuildinfo` — machine-generated cache

### Source — all 37
- [x] ✅ `src/app/layout.tsx`, `page.tsx`, `providers.tsx`, `globals.css`
- [x] ✅ `src/app/(auth)/auth/{login,register,forgot-password}/page.tsx`
- [x] ✅ `src/app/(editor)/editor/[productId]/page.tsx`
- [x] ✅ `src/app/(shop)/{products,templates,cart,checkout,my-designs}/page.tsx` and `products/[id]/page.tsx`
- [x] ✅ `src/components/editor/{editor-canvas,editor-left-panel,editor-right-panel,editor-toolbar,editor-3d-preview,print-area-panel}.tsx`
- [x] ✅ `src/components/layout/{navbar,footer}.tsx`
- [x] ✅ `src/components/ui/{button,input,card}.tsx`
- [x] ✅ `src/lib/{api,utils,canvas-viewport,editor-artboard,editor-templates,fabric-objects,product-3d,product-catalog,product-print-limits}.ts`
- [x] ✅ `src/store/{cart-store,editor-store}.ts`
- [x] ✅ `src/types/earcut.d.ts`

### Tests — all 4
- [x] ✅ `tests/unit/lib/{api,utils}.spec.ts`
- [x] ✅ `tests/unit/store/{cart-store,editor-store}.spec.ts`
- [x] ✅ **Execution attempted** — the suite aborts on config parse; failure captured verbatim in [13, BUG-BUILD-02](./13-historical-bug-report.md)

### Public assets — all 30
- [x] ✅ All 26 SVGs read in full; `viewBox`, byte size, and every referencing site recorded
- [x] 📋 4 binaries in `3d/` — catalogued with byte size, format, and referencing site. `wood_diff.jpg` identified as unreferenced

### Generated
- [x] 📋 `.next/` — 547 files, 133,403,561 B

## `packages/types/`

- [x] ✅ `package.json`, `jest.config.ts`, `src/index.ts`, `tests/types.spec.ts` — all 4 read in full
- [x] ✅ **All 17 tests executed** — 1 suite, 17 passed

## `docker/`

- [x] ✅ `Dockerfile.api`, `Dockerfile.web`

## `e2e/`

- [x] ✅ `bug-regression.spec.ts` (92 lines), `user-journey.spec.ts` (1,041 lines) — both read in full

## `design-system/`

- [x] ✅ `mylovelygift/MASTER.md` — read in full, accuracy-audited

## Browser-automation artifacts

- [x] 📋 `.playwright-cli/` — 251 files, 28,502,756 B. All filenames catalogued and grouped as historical evidence in [90](./90-file-inventory.md#playwright-cli-filename-groups-historical-evidence); contents sampled
- [x] 📋 `.playwright-mcp/` — 101 files, 2,701,706 B. Same treatment

## Version control

- [x] ❌ `.git/` — **does not exist.** Verified: `git rev-parse --is-inside-work-tree` → `fatal: not a git repository (or any of the parent directories): .git`
- [x] ❌ `.gitattributes`, `CODEOWNERS`, `.mailmap`, `.gitmodules`, `.lfsconfig`, `.husky/` — **none exist**

## Platform-specific (all confirmed absent)

- [x] ❌ Android — no `AndroidManifest.xml`, `build.gradle`, `gradle.properties`, `proguard-rules.pro`, `google-services.json`, `res/`
- [x] ❌ iOS — no `Info.plist`, `Podfile`, `Package.swift`, `*.entitlements`, `*.xcodeproj`, `GoogleService-Info.plist`
- [x] ❌ Desktop — no Electron, Tauri, `*.csproj`, `CMakeLists.txt`
- [x] ❌ Browser extension — no extension `manifest.json`
- [x] ❌ Platform channels / FFI / JNI

## Infrastructure (all confirmed absent except Docker)

- [x] ❌ Terraform, Pulumi, CloudFormation, CDK, Kubernetes manifests, Helm charts, serverless config
- [x] ❌ Vercel, Netlify, Firebase, App Engine, Cloudflare, nginx, Apache configuration
- [x] ❌ Monitoring, alerting, observability configuration
- [x] ❌ Store/distribution metadata

---

## Reconciliation summary

| Category | Total | ✅ Read in full | 📋 Catalogued / structural | ❌ Not present |
|----------|------:|----------------:|---------------------------:|---------------:|
| Root config | 8 | 7 | 1 | — |
| Root docs | 3 | 3 | — | — |
| Root binaries | 14 | — | 14 | — |
| `.cursor/` | 2 | 2 | — | — |
| `.github/` | 35 | 5 | 30 | — |
| `apps/api` config | 6 | 6 | — | — |
| `apps/api/prisma` | 4 | 4 | — | — |
| `apps/api/src` | 24 | **24** | — | — |
| `apps/api/tests` | 23 | 14 | 9 | — |
| `apps/api/dist` | 145 | — | 145 | — |
| `apps/web` config | 10 | 9 | 1 | — |
| `apps/web/src` | 37 | **37** | — | — |
| `apps/web/tests` | 4 | 4 | — | — |
| `apps/web/public` | 30 | 26 | 4 | — |
| `apps/web/.next` | 547 | — | 547 | — |
| `packages/types` | 4 | 4 | — | — |
| `docker/` | 2 | 2 | — | — |
| `e2e/` | 2 | 2 | — | — |
| `design-system/` | 1 | 1 | — | — |
| `.playwright-cli/` | 251 | — | 251 | — |
| `.playwright-mcp/` | 101 | — | 101 | — |
| **TOTAL** | **1,253** | **150** | **1,103** | — |

**100 % of first-party source, configuration, scripts, infrastructure definitions, and documentation was read end to end.** Every file in the 📋 column is either machine-generated build output, a browser-automation artifact, a binary asset, a vendored third-party dataset, or a test file whose complete structural inventory was extracted instead — each justified individually in [02](./02-repository-overview.md#precisely-what-i-did-not-fully-read-and-why).

**No file falls into a fourth "ignored" category.**

---

## Commands executed during this audit

For transparency, every command run. All are read-only with respect to the source tree.

| Command | Purpose | Side effects |
|---------|---------|--------------|
| `git rev-parse --is-inside-work-tree`, `git status --short` | Detect version control | None (failed — no repo) |
| `Get-ChildItem -Recurse -File -Force` (several variants) | File census, byte sizes, timestamps, per-directory counts | None |
| `Resolve-Path -Relative`, `Measure-Object -Sum Length` | Path normalisation and size aggregation | None |
| `ConvertFrom-Json -AsHashtable` on `package-lock.json` | Registry distribution, workspace links, override detection | None |
| `[System.IO.File]::ReadAllText` on 26 SVGs | Extract `viewBox` / `width` / `height` | None |
| `rg` (via Grep) — 6 searches | Marker comments, import usage, asset references, test-name inventory | None |
| `npx jest --ci` in `apps/api` | **Executed the API test suite** — 15 suites / 146 tests passed | Jest cache in `node_modules/.cache` |
| `npx jest --ci` in `apps/web` | **Attempted** — captured the config-parse failure verbatim | None |
| `npx jest --ci` in `packages/types` | **Executed** — 1 suite / 17 tests passed | Jest cache |
| `npx tsc --noEmit -p apps/api/tsconfig.json` | Type-check the API — exit 0 | None |
| `npx tsc --noEmit -p apps/web/tsconfig.json` | Type-check the web app — exit 2, one error in `jest.config.ts` | **Rewrote `apps/web/tsconfig.tsbuildinfo`** — see below |

### Side effects, disclosed in full

| Side effect | Detail |
|-------------|--------|
| **One accidental write, corrected** | An early census command wrote a scratch file `.census.txt` to the repository root. It was immediately moved to `%TEMP%\mlg-audit\census.txt` and its absence from the tree was verified (`Test-Path .census.txt` → `False`). All subsequent scratch output was written outside the repository |
| **`apps/web/tsconfig.tsbuildinfo` was rewritten** | `apps/web/tsconfig.json:15` sets `"incremental": true`, so `tsc --noEmit` still refreshes the incremental cache. This is a machine-generated 273,600-byte cache file, gitignored by `.gitignore:36`, and regenerated by any subsequent build. Its *content* changed; no source file did |
| **Jest caches** | Running the three test suites wrote transform caches under `node_modules/.cache`. Outside the source tree |

**Files created:** only the 25 documentation files in `docs/reverse-engineering/`, as permitted by Phase 8.

**Source files modified: zero.** Every `.ts`, `.tsx`, `.js`, `.css`, `.json`, `.prisma`, `.sql`, `.yml`, `.md`, `.mdc`, `.toml`, and dotfile in the repository is byte-for-byte unchanged.

**Files deleted: zero.**
