# 03 — Technology Stack

[← Index](./00-index.md)

Everything here is taken from manifests and source imports. Where the repository's own documentation names a different technology than the code uses, both are shown and the discrepancy is flagged.

## 3.1 Languages and version constraints

| Language | Constraint | Where pinned | Notes |
|----------|-----------|--------------|-------|
| TypeScript | `^5.5.0` in all three workspaces | `package.json:30`, `apps/api/package.json:57`, `apps/web/package.json:62` | Root `tsconfig.json:3` targets `ES2022`, `module: ESNext`, `moduleResolution: bundler`, `strict: true`, `noEmit: true` |
| JavaScript | ES2022 | `tsconfig.json:3-4` | Only 2 first-party `.js` files: `apps/web/next.config.js`, `apps/web/postcss.config.js` |
| SQL | PostgreSQL dialect | `apps/api/prisma/schema.prisma:6` (`provider = "postgresql"`) | One migration: `apps/api/prisma/migrations/20260530232216_init/migration.sql` (284 lines) |
| Prisma Schema Language | Prisma 5.17 | `apps/api/package.json:54` | `apps/api/prisma/schema.prisma` |
| Python | 3.x, only for vendored tooling | `README.md:69` ("Python 3.x (for UI UX Pro Max search scripts)") | `.pyc` files present for CPython **3.11** and **3.14** (`core.cpython-311.pyc`, `core.cpython-314.pyc`), implying two different interpreters have run this code |
| CSS | PostCSS + Tailwind | `apps/web/postcss.config.js:1-6` | Single stylesheet `apps/web/src/app/globals.css` (74 lines) |

### Runtime / toolchain pinning

| Tool | Pin | Location |
|------|-----|----------|
| Node.js | `>=20.0.0` | `package.json:32-34` |
| npm | `10.0.0` (via `packageManager`) | `package.json:35` |
| Docker base image (API + Web) | `node:20-alpine` | `docker/Dockerfile.api:1,12`, `docker/Dockerfile.web:1,11` |
| PostgreSQL | `postgres:16-alpine` | `docker-compose.yml:4` |
| Redis | `redis:7-alpine` | `docker-compose.yml:22` |
| MinIO | `minio/minio:latest` — **unpinned** | `docker-compose.yml:36` |
| Medusa runtime | `node:20-alpine` — **no Medusa image, no build step, no command** | `docker-compose.yml:55-57` |

**Not present:** `.nvmrc`, `.node-version`, `.tool-versions`, `.sdkmanrc`, `rust-toolchain`, `.python-version`, `Dockerfile` for the root, `devcontainer.json`.

### Support / EOL status of pinned versions

`[UNVERIFIED: EOL dates — I did not contact any external service to check current support status. The statements below are structural observations only.]`

- Node 20 is the pinned floor and is an LTS line; the images use `node:20-alpine`, which is a moving tag and will drift.
- `minio/minio:latest` is unpinned and will drift arbitrarily. This is a reproducibility defect.
- Next.js is constrained to `^14.2.0` (`apps/web/package.json:36`); the build log records `Next.js 14.2.35` was actually used (`apps/web/.turbo/turbo-build.log:9`).
- MedusaJS is pinned to `^1.20.0` / `medusa-js@^6.1.0` (`apps/api/package.json:21-22`), the v1 line.

## 3.2 Frontend stack (`apps/web`)

All versions from `apps/web/package.json`.

| Layer | Package | Version range | Actually used at |
|-------|---------|--------------|------------------|
| Framework | `next` | `^14.2.0` | Every file under `apps/web/src/app/` |
| UI runtime | `react`, `react-dom` | `^18.3.0` | Everywhere |
| Styling | `tailwindcss` (dev) | `^3.4.0` | `apps/web/tailwind.config.ts`, `apps/web/src/app/globals.css` |
| Styling utils | `clsx`, `tailwind-merge` | `^2.1.0`, `^2.4.0` | `apps/web/src/lib/utils.ts:1-6` |
| Variants | `class-variance-authority` | `^0.7.0` | `apps/web/src/components/ui/button.tsx:3,6` |
| Tailwind plugin | `tailwindcss-animate` | `^1.0.7` | `apps/web/tailwind.config.ts:155` |
| PostCSS | `postcss`, `autoprefixer` (dev) | `^8.4.0`, `^10.4.0` | `apps/web/postcss.config.js:2-5` |
| Icons | `lucide-react` | `^0.400.0` | 8 files; e.g. `apps/web/src/components/editor/editor-toolbar.tsx:4-17` |
| Toasts | `sonner` | `^1.5.0` | `apps/web/src/app/layout.tsx:2,24` + 6 call sites |
| **2D canvas** | `fabric` | `^6.0.0` | `apps/web/src/components/editor/editor-canvas.tsx:4`, `apps/web/src/lib/editor-templates.ts:1`, `apps/web/src/lib/fabric-objects.ts:1`, `apps/web/src/lib/canvas-viewport.ts:1`, `apps/web/src/lib/editor-artboard.ts:1`, `apps/web/src/components/editor/editor-left-panel.tsx:23`, `apps/web/src/components/editor/editor-right-panel.tsx:908` |
| **3D engine** | `@babylonjs/core` | `^7.54.3` | `apps/web/src/lib/product-3d.ts:1-24` (24 deep-path imports for tree-shaking) |
| 3D triangulation | `earcut` | `^3.0.2` | `apps/web/src/lib/product-3d.ts:18,266,347`; typed by `apps/web/src/types/earcut.d.ts` |
| Client state | `zustand` | `^4.5.0` | `apps/web/src/store/cart-store.ts:1-2`, `apps/web/src/store/editor-store.ts:1` |
| Server state | `@tanstack/react-query` | `^5.50.0` | `apps/web/src/app/providers.tsx:3` — **provider mounted, zero queries defined** |
| HTTP | `axios` | `^1.7.0` | `apps/web/src/lib/api.ts:1,6` |
| Radix primitives | `@radix-ui/react-slot` | `^1.1.0` | `apps/web/src/components/ui/button.tsx:2` — **the only Radix package actually imported** |
| Radix primitives (unused) | `react-dialog`, `react-dropdown-menu`, `react-popover`, `react-scroll-area`, `react-select`, `react-separator`, `react-slider`, `react-tabs`, `react-tooltip` | various | **Zero imports in `apps/web/src`** |
| Animation | `framer-motion` | `^11.3.0` | **Zero imports.** All animation is CSS keyframes in `apps/web/tailwind.config.ts:117-152` |
| Forms | `react-hook-form`, `@hookform/resolvers` | `^7.52.0`, `^3.9.0` | **Zero imports.** All forms use raw `useState` |
| Validation | `zod` | `^3.23.0` | **Zero imports.** All validation is hand-written (`apps/web/src/app/(shop)/checkout/page.tsx:36-59`) |
| Dates | `date-fns` | `^3.6.0` | **Zero imports** |
| Commerce client | `@medusajs/medusa-js` | `^6.1.0` | **Zero imports in the frontend** (it *is* used in the API) |

## 3.3 Backend stack (`apps/api`)

All versions from `apps/api/package.json`.

| Layer | Package | Version | Used at |
|-------|---------|---------|---------|
| Framework core | `@nestjs/core`, `@nestjs/common` | `^10.3.0` | `apps/api/src/main.ts:1-2`, every module |
| HTTP adapter | `@nestjs/platform-express` | `^10.3.0` | Implicit via `NestFactory.create` (`apps/api/src/main.ts:9`) |
| Config | `@nestjs/config` | `^3.2.0` | `apps/api/src/app.module.ts:2,14`; `ConfigService` in `apps/api/src/common/medusa/medusa.service.ts:2,9` and `apps/api/src/modules/assets/assets.service.ts:2,20` |
| OpenAPI | `@nestjs/swagger` | `^7.3.0` | `apps/api/src/main.ts:3,32-39`; `@ApiTags`/`@ApiOperation` on all 6 controllers |
| ORM | `@prisma/client` + `prisma` | `^5.17.0` | `apps/api/src/common/prisma/prisma.service.ts:2` |
| Security headers | `helmet` | `^7.1.0` | `apps/api/src/main.ts:4,12` |
| Compression | `compression` | `^1.7.4` | `apps/api/src/main.ts:5,13` |
| Validation | `class-validator`, `class-transformer` | `^0.14.0`, `^0.5.1` | Declared and required by `ValidationPipe` (`apps/api/src/main.ts:20-26`), but **no DTO class with decorators exists anywhere** — all request bodies are inline TypeScript interfaces |
| Reactive | `rxjs` | `^7.8.0` | Peer requirement of NestJS; no direct import in first-party code |
| Metadata | `reflect-metadata` | `^0.2.0` | Peer requirement of NestJS decorators |
| UUID | `uuid` | `^10.0.0` | `apps/api/src/modules/assets/assets.service.ts:11,35` |
| S3 | `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | `^3.600.0` | `apps/api/src/modules/assets/assets.service.ts:3-9` |
| Commerce | `@medusajs/medusa-js` | `^6.1.0` | `apps/api/src/common/medusa/medusa.service.ts:3,10-13` |
| Commerce server | `@medusajs/medusa` | `^1.20.0` | **Zero imports.** Declared but never used |
| Rate limiting | `express-rate-limit` | `^7.3.0` | **Zero imports.** `.github/copilot-instructions.md:673` claims it is "already configured" — it is not; `apps/api/src/main.ts` has no rate limiter |
| Cache | `@nestjs/cache-manager`, `cache-manager`, `cache-manager-redis-yet` | `^2.2.0`, `^5.7.0`, `^5.1.0` | **Zero imports.** `CacheModule` is never registered in `apps/api/src/app.module.ts:12-23` |
| Queue | `@nestjs/bull`, `bull` | `^10.1.0`, `^4.12.0` | **Zero imports.** `BullModule` is never registered |
| Image processing | `sharp` | `^0.33.0` | **Zero imports** |

## 3.4 Data and storage services

| Service | Technology | Config | Actually reachable from code? |
|---------|-----------|--------|-------------------------------|
| Primary DB | PostgreSQL 16 | `docker-compose.yml:3-18`, host port **5433** | Yes — `apps/api/src/common/prisma/prisma.service.ts` |
| Cache | Redis 7 | `docker-compose.yml:20-32`, port 6379 | **No.** `REDIS_URL` is set in `apps/api/.env:3` but nothing reads it |
| Object storage | MinIO (S3-compatible) | `docker-compose.yml:34-51`, ports 9000/9001 | Yes — `apps/api/src/modules/assets/assets.service.ts:22-31` |
| Commerce engine | MedusaJS v1 | `docker-compose.yml:53-71`, profile `medusa` | Client is constructed (`apps/api/src/common/medusa/medusa.service.ts:10-13`) but **no controller route reaches any `MedusaService` method** |

**Database URL port mismatch:** `apps/api/.env:2` uses `localhost:5433` (correct, matches `docker-compose.yml:11`), but `.env.example:5` uses `localhost:5432` (wrong). A developer who follows `README.md:75` (`cp .env.example .env`) gets a non-working database connection.

## 3.5 Build, test, and dev tooling

| Tool | Version | Config file | Status |
|------|---------|-------------|--------|
| Turborepo | `^2.1.0` | `turbo.json` | Working |
| Next.js compiler (SWC) | bundled with Next 14.2 | `apps/web/next.config.js` | Working |
| NestJS CLI | `^10.4.0` | `apps/api/nest-cli.json` | Working (`npx tsc --noEmit` on `apps/api` exits 0) |
| Jest (API) | `^29.7.0` + `ts-jest ^29.4.11` | `apps/api/jest.config.ts` | **Working** — 15 suites / 146 tests pass |
| Jest (types) | `^29.7.0` + `ts-jest` | `packages/types/jest.config.ts` | **Working** — 1 suite / 17 tests pass |
| Jest (web) | `^29.7.0` + `@swc/jest ^0.2.0` | `apps/web/jest.config.ts` | **BROKEN** — `TS2322` at `apps/web/jest.config.ts:9`; Jest aborts in `readConfigFileAndSetRootDir` before collecting tests |
| jsdom env | `jest-environment-jsdom ^29.7.0` | `apps/web/jest.config.ts:4` | Unreachable due to the above |
| Testing Library | `@testing-library/react ^16.0.0`, `@testing-library/jest-dom ^6.4.0` | — | `act` imported at `apps/web/tests/unit/store/cart-store.spec.ts:2` and `editor-store.spec.ts:2`; `jest-dom` matchers **never registered** (`apps/web/jest.config.ts:16` writes `setupFilesAfterFramework`, which is not a Jest option — the correct key is `setupFilesAfterEnv`) |
| Playwright | `@playwright/test ^1.60.0` | `playwright.config.ts` | Configured but targets port **3001** while `npm run dev:web` serves **3000** |
| Playwright CLI | `@playwright/cli ^0.1.13` | — | Driven by `package.json:22-24` scripts and documented in `.cursor/skills/playwright-cli/SKILL.md` |
| ESLint | `^8.57.0` + `eslint-config-next ^14.2.0` | **No config file exists** | `apps/web/package.json:9` runs `next lint`; `apps/api/package.json:10` runs `eslint "{src,apps,libs,test}/**/*.ts"` with no `.eslintrc*` or `eslint.config.*` in the tree |
| Prettier | not installed | — | **Not present** |
| Pre-commit hooks | none | — | **Not present** (no `.husky/`, no `lint-staged`, no `.git/hooks`) |
| Commit-message hooks | none | — | **Not present** |

## 3.6 Code generation pipelines (Phase 2.33)

| Generator | Input | Output | Invocation | Committed? | Drift risk |
|-----------|-------|--------|-----------|-----------|------------|
| Prisma Client | `apps/api/prisma/schema.prisma` | `node_modules/.prisma/client` | `prisma generate` — `apps/api/package.json:14`, root alias `package.json:18` | No (in `node_modules`) | **High.** `apps/api/.turbo/turbo-build.log:12-23` records a real failure where `Prisma.ProductWhereInput` / `ProductCreateInput` / `ProductUpdateInput` did not exist because the client had not been regenerated after a schema change. The build now passes (`npx tsc --noEmit` exits 0), meaning the client has since been generated — but nothing enforces it. `docker/Dockerfile.api:9` does run `npx prisma generate`, so the container path is protected; the local path is not. |
| Prisma Migrate | `apps/api/prisma/schema.prisma` | `apps/api/prisma/migrations/**/migration.sql` | `prisma migrate dev` — `apps/api/package.json:15`, root alias `package.json:17` | **Yes, physically — but `.gitignore:48` would exclude them** | **Critical.** See [15](./15-technical-debt.md) |
| Next.js build | `apps/web/src/**` | `apps/web/.next/**` | `next build` | No (gitignored) | Low |
| Nest build | `apps/api/src/**` | `apps/api/dist/**` | `nest build`, `deleteOutDir: true` (`apps/api/nest-cli.json:6`) | No (gitignored) | Low |
| `next-env.d.ts` | Next.js | `apps/web/next-env.d.ts` | `next dev`/`next build` | Present but gitignored (`.gitignore:37`) | Low |
| ui-ux-pro-max design system | `.github/prompts/ui-ux-pro-max/data/*.csv` | `design-system/<slug>/MASTER.md` | `python search.py "<query>" --design-system --persist -p "<name>"` (`.github/prompts/ui-ux-pro-max/scripts/search.py:76-98`) | **Yes** — `design-system/mylovelygift/MASTER.md` is committed | **Realised.** The generated file's palette (`#6366F1`/`#22C55E`) does not match the implemented palette (`#7C3AED`/`#06B6D4`/`#F97316`). See [19](./19-missing-documentation.md) |

**Not present:** GraphQL codegen, OpenAPI client generation, Protobuf, DI codegen, serialization codegen, `build_runner`, Room/Realm/Drift.

## 3.7 Scripts inventory (Phase 1.5)

Every runnable script in the repository.

### Root — `package.json:10-25`

| Script | Command | Purpose | Who runs it |
|--------|---------|---------|-------------|
| `dev` | `turbo run dev` | Start both apps in watch mode | Developer |
| `build` | `turbo run build` | Build both apps | Developer / would-be CI |
| `lint` | `turbo run lint` | Lint both apps | Developer — **will fail: no ESLint config exists** |
| `test` | `turbo run test` | Run all workspace tests; `turbo.json:16-18` makes `test` depend on `^build` | Developer — will run the broken web suite |
| `dev:web` | `cd apps/web && npm run dev` | Frontend only, Next default port **3000** | Developer; also `playwright.config.ts:22` `webServer.command` |
| `dev:api` | `cd apps/api && npm run dev` | Backend only, port 4000 | Developer |
| `db:migrate` | `cd apps/api && npx prisma migrate dev` | Apply/create migrations | Developer |
| `db:generate` | `cd apps/api && npx prisma generate` | Regenerate Prisma client | Developer |
| `db:seed` | `cd apps/api && npx prisma db seed` | Seed via `apps/api/prisma/seed.ts` (`apps/api/package.json:59-61`) | Developer |
| `docker:up` | `docker-compose up -d` | Start infra (only default-profile services: postgres, redis, minio) | Developer |
| `docker:down` | `docker-compose down` | Stop infra | Developer |
| `browser:open` | `playwright-cli -s=my-lovely-gift open http://localhost:3000 --headed` | Open the automation browser | Agent/QA — note **port 3000**, contradicting `playwright.config.ts:12` |
| `browser:show` | `playwright-cli show` | List sessions | Agent/QA |
| `browser:close` | `playwright-cli -s=my-lovely-gift close` | Close session | Agent/QA |

### `apps/api/package.json:5-17`

| Script | Command | Notes |
|--------|---------|-------|
| `dev` | `nest start --watch` | |
| `build` | `nest build` | Currently succeeds; historically failed (see `apps/api/.turbo/turbo-build.log`) |
| `start` / `start:prod` | `node dist/main` | Identical commands, duplicated |
| `lint` | `eslint "{src,apps,libs,test}/**/*.ts"` | **Broken** — no ESLint config; also globs `apps/` and `libs/` which do not exist under `apps/api` |
| `test` | `jest` | ✅ 146 tests pass |
| `test:coverage` | `jest --coverage` | Threshold not configured |
| `test:watch` | `jest --watch` | |
| `prisma:generate` | `prisma generate` | |
| `prisma:migrate` | `prisma migrate dev` | |
| `prisma:seed` | `ts-node prisma/seed.ts` | Also wired as the Prisma seed hook (`apps/api/package.json:59-61`) |

### `apps/web/package.json:5-12`

| Script | Command | Notes |
|--------|---------|-------|
| `dev` | `next dev` | **Port 3000** (Next default) |
| `build` | `next build` | |
| `start` | `next start` | |
| `lint` | `next lint` | No ESLint config file present |
| `test` | `jest` | ❌ Aborts on config parse |
| `test:coverage` | `jest --coverage` | ❌ Same |

### `packages/types`

No `scripts` block at all (`packages/types/package.json:1-7`), yet `packages/types/jest.config.ts` exists and 17 tests pass when Jest is invoked directly. `turbo run test` will therefore skip this package silently.

### Standalone scripts

| Script | Language | Purpose | Invocation |
|--------|----------|---------|-----------|
| `.github/prompts/ui-ux-pro-max/scripts/search.py` | Python 3 | CLI entry point for the BM25 design-guide search / design-system generator | `python3 prompts/ui-ux-pro-max/scripts/search.py "<query>" --design-system` (`.github/prompts/ui-ux-pro-max/PROMPT.md:49`) |
| `.github/prompts/ui-ux-pro-max/scripts/core.py` | Python 3 | BM25 index + CSV schema config (`core.py:17-61`) | Imported by `search.py:20` |
| `.github/prompts/ui-ux-pro-max/scripts/design_system.py` | Python 3 | Assembles + persists a design system markdown file | Imported by `search.py:21` |
| `apps/api/prisma/seed.ts` | TypeScript | Seeds 1 tenant, 4 category templates, 4 products, 6 design templates | `npm run db:seed` |

**No** shell scripts (`.sh`), PowerShell scripts (`.ps1`), Makefiles, or Gradle tasks exist.

## 3.8 Documented-vs-actual technology discrepancies

These matter because `.github/copilot-instructions.md` is declared "Single source of truth for all AI agents working on this repository" (`.github/copilot-instructions.md:3`).

| Claim | Location | Reality | Evidence |
|-------|----------|---------|----------|
| "3D Rendering — Three.js + R3F + Drei 0.167.x" | `.github/copilot-instructions.md:172` | **Babylon.js 7.54.3.** `three`, `@react-three/fiber`, and `@react-three/drei` are not in any `package.json` | `apps/web/package.json:14`, `apps/web/src/lib/product-3d.ts:1-24` |
| "3D (future) — Three.js + React Three Fiber" | `README.md:28` | 3D is fully implemented today, with Babylon | `apps/web/src/components/editor/editor-3d-preview.tsx`, `apps/web/src/lib/product-3d.ts` (679 lines) |
| "Use `React.lazy()` + `Suspense` for code-split routes" / "Lazy-load heavy frontend components (editor, 3D preview)" | `.github/copilot-instructions.md:927-928` | No `React.lazy`, no `next/dynamic`, no `Suspense` anywhere in `apps/web/src` | Grep across `apps/web/src` returns zero matches |
| "Use `express-rate-limit` (already configured)" | `.github/copilot-instructions.md:673` | Not imported or configured | `apps/api/src/main.ts:1-47` |
| "Caching: Cache … in Redis" | `.github/copilot-instructions.md:920` | `CacheModule` never registered | `apps/api/src/app.module.ts:12-23` |
| "Use Bull queues for heavy processing" | `.github/copilot-instructions.md:926` | `BullModule` never registered | `apps/api/src/app.module.ts:12-23` |
| "`/health` endpoint returning database and Redis connectivity status" | `.github/copilot-instructions.md:972` | No health controller exists | Full `apps/api/src` read |
| "Mock Prisma with `jest-mock-extended` (`mockDeep<PrismaClient>()`)" | `.github/copilot-instructions.md:781` | `jest-mock-extended` is not a dependency; tests use a hand-rolled mock | `apps/api/tests/mocks/prisma.mock.ts:4-52` |
| "phone cases, tote bags" among products | `.github/copilot-instructions.md:39` | Only cup, t-shirt, sticker, badge exist | `apps/web/src/lib/product-catalog.ts:1`, `apps/api/prisma/seed.ts:22-104` |
| "packages/editor — Shared editor logic", "packages/shared" | `.github/copilot-instructions.md:264-265`, `README.md:56-57` | Neither directory exists; `packages/` contains only `types` | Recursive census |
| "Frontend displays prices formatted with `Intl.NumberFormat`" | `.github/copilot-instructions.md:729` | Every price uses `.toFixed(2)` with a hardcoded `$` | `apps/web/src/app/(shop)/cart/page.tsx:89,134,146,156`, `apps/web/src/app/(shop)/checkout/page.tsx:406,411,416,421` |
| "components/shop/", "components/templates/" directories | `.github/copilot-instructions.md:253-254` | Do not exist; only `editor/`, `layout/`, `ui/` | `apps/web/src/components/` |
| "src/app/api/ — Next.js API routes" | `.github/copilot-instructions.md:249` | Does not exist | `apps/web/src/app/` listing |
| "apps/api/src/config/" | `.github/copilot-instructions.md:234` | Does not exist | `apps/api/src/` listing |
| "CI/CD pipeline — `.github/workflows/`" | `.github/copilot-instructions.md:1134` | Directory does not exist | Recursive census |
