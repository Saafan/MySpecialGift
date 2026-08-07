# 05 — Dependency Analysis

[← Index](./00-index.md)

## 5.0 Lockfile facts

| Property | Value | How determined |
|----------|-------|----------------|
| Lockfile | Single `package-lock.json` at repo root, 844,854 bytes | Recursive census; no `yarn.lock`, `pnpm-lock.yaml`, or `bun.lockb` exists |
| `lockfileVersion` | `3` | Parsed `package-lock.json` |
| Total resolved entries | **1,648** | Parsed `package-lock.json` `.packages` |
| Registry sources | **`registry.npmjs.org` × 1,641** — 100 % of resolvable entries. No git URLs, no tarball URLs, no private registries | Parsed and grouped by URI host |
| Entries without `resolved` | 3 | The 3 workspace links below |
| Workspace links | `node_modules/@my-lovely-gift/api → apps/api`, `node_modules/@my-lovely-gift/types → packages/types`, `node_modules/@my-lovely-gift/web → apps/web` | Parsed `link: true` entries |
| `overrides` | **absent** | Root key check |
| `resolutions` | **absent** | Root key check |
| `pnpm.patchedDependencies` | **absent** | Root key check |
| `patch-package` | not a dependency; no `patches/` directory exists | Manifest + census |
| Installed top-level packages | 982 directories under `node_modules/` | `(Get-ChildItem -Directory node_modules).Count` |

**Reading:** supply-chain hygiene at the lockfile level is clean. No forced overrides, no patched packages, no non-npm sources. The risk in this repository is not tampering — it is *unused surface area* (see 5.4).

`[UNVERIFIED: known CVEs. I did not run npm audit, did not contact the npm advisory database, and did not contact any vulnerability service. No CVE claim is made anywhere in this document. The evidence that would resolve this is a network-enabled `npm audit --json` or an SCA scan.]`

`[UNVERIFIED: exact licences. No LICENSE files were read from node_modules and no licence field was extracted. The licence column below states only what is publicly conventional for each package and is marked as such.]`

---

## 5.1 Root workspace — `package.json`

All four are `devDependencies` (`package.json:26-31`). There are **no** root `dependencies`.

| Package | Version | Type | Purpose | Used at | Verdict |
|---------|---------|------|---------|---------|---------|
| `@playwright/cli` | `^0.1.13` | dev | Interactive browser-automation CLI for agent-driven QA | `package.json:22-24` scripts; `.cursor/skills/playwright-cli/SKILL.md:19-46` | **Used.** Note the `0.x` version — unstable API surface |
| `@playwright/test` | `^1.60.0` | dev | E2E runner | `playwright.config.ts:1`; `e2e/bug-regression.spec.ts:1`; `e2e/user-journey.spec.ts:1` | **Used but the suite cannot run** (port mismatch, see [04](./04-framework-inventory.md#playwright)) |
| `turbo` | `^2.1.0` | dev | Monorepo task runner | `package.json:11-14`; `turbo.json` | **Used** |
| `typescript` | `^5.5.0` | dev | Compiler | `tsconfig.json` | **Used** |

---

## 5.2 `apps/web` dependencies

### Runtime dependencies (`apps/web/package.json:13-45`) — 32 packages

| # | Package | Version | Purpose | Where used (file:line) | Verdict |
|---|---------|---------|---------|------------------------|---------|
| 1 | `@babylonjs/core` | `^7.54.3` | 3D product preview engine | `apps/web/src/lib/product-3d.ts:1-24` | ✅ **Load-bearing** |
| 2 | `@hookform/resolvers` | `^3.9.0` | zod↔react-hook-form bridge | — | ❌ **Unused** (0 imports) |
| 3 | `@medusajs/medusa-js` | `^6.1.0` | Commerce client | — | ❌ **Unused in the frontend** (0 imports) |
| 4 | `@radix-ui/react-dialog` | `^1.1.0` | Accessible modal | — | ❌ **Unused** |
| 5 | `@radix-ui/react-dropdown-menu` | `^2.1.0` | Accessible menu | — | ❌ **Unused** |
| 6 | `@radix-ui/react-popover` | `^1.1.0` | Accessible popover | — | ❌ **Unused** |
| 7 | `@radix-ui/react-scroll-area` | `^1.1.0` | Custom scrollbars | — | ❌ **Unused** |
| 8 | `@radix-ui/react-select` | `^2.1.0` | Accessible select | — | ❌ **Unused** (raw `<select>` used at `editor-right-panel.tsx:680,713`) |
| 9 | `@radix-ui/react-separator` | `^1.1.0` | Divider | — | ❌ **Unused** (raw `<div className="w-px h-6">` at `editor-toolbar.tsx:119,152`) |
| 10 | `@radix-ui/react-slider` | `^1.2.0` | Accessible slider | — | ❌ **Unused** (raw `<input type="range">` at `editor-right-panel.tsx:65`, `print-area-panel.tsx:84,119`, `products/page.tsx:170`) |
| 11 | `@radix-ui/react-slot` | `^1.1.0` | `asChild` polymorphism | `apps/web/src/components/ui/button.tsx:2,49` | ⚠️ **Imported but the `asChild` prop is never passed by any caller** |
| 12 | `@radix-ui/react-tabs` | `^1.1.0` | Accessible tabs | — | ❌ **Unused** (hand-rolled at `editor-left-panel.tsx:45-63`) |
| 13 | `@radix-ui/react-tooltip` | `^1.1.0` | Accessible tooltip | — | ❌ **Unused** (native `title=` used throughout) |
| 14 | `@tanstack/react-query` | `^5.50.0` | Server-state cache | `apps/web/src/app/providers.tsx:3,9,20` | ⚠️ **Provider mounted, zero queries** |
| 15 | `axios` | `^1.7.0` | HTTP client | `apps/web/src/lib/api.ts:1,6,15` | ✅ Used (3 auth call sites) |
| 16 | `class-variance-authority` | `^0.7.0` | Variant class builder | `apps/web/src/components/ui/button.tsx:3,6-39` | ✅ Used |
| 17 | `clsx` | `^2.1.0` | Conditional classnames | `apps/web/src/lib/utils.ts:1,5` | ✅ Used |
| 18 | `date-fns` | `^3.6.0` | Date formatting | — | ❌ **Unused** |
| 19 | `earcut` | `^3.0.2` | Polygon triangulation for Babylon `ExtrudePolygon` | `apps/web/src/lib/product-3d.ts:18,266,347` | ✅ Used (required by Babylon at runtime) |
| 20 | `fabric` | `^6.0.0` | 2D canvas editor | 7 files — see [04](./04-framework-inventory.md#fabricjs-6) | ✅ **Load-bearing** |
| 21 | `framer-motion` | `^11.3.0` | Animation library | — | ❌ **Unused** (all motion is CSS keyframes, `tailwind.config.ts:117-152`) |
| 22 | `lucide-react` | `^0.400.0` | Icon set | 8 files, e.g. `editor-toolbar.tsx:4-17`, `navbar.tsx:6-13` | ✅ Used |
| 23 | `next` | `^14.2.0` | Framework | Everywhere | ✅ **Load-bearing** |
| 24 | `react` | `^18.3.0` | UI runtime | Everywhere | ✅ **Load-bearing** |
| 25 | `react-dom` | `^18.3.0` | DOM renderer | Implicit via Next | ✅ **Load-bearing** |
| 26 | `react-hook-form` | `^7.52.0` | Form state | — | ❌ **Unused** (raw `useState` in login/register/checkout) |
| 27 | `sonner` | `^1.5.0` | Toast notifications | `apps/web/src/app/layout.tsx:2,24` + 6 `toast.*` call sites | ✅ Used |
| 28 | `tailwind-merge` | `^2.4.0` | Utility-class dedupe | `apps/web/src/lib/utils.ts:2,5` | ✅ Used |
| 29 | `tailwindcss-animate` | `^1.0.7` | Tailwind animation plugin | `apps/web/tailwind.config.ts:155` | ⚠️ Registered; only `accordion-down`/`accordion-up` keyframes reference Radix vars that are never used |
| 30 | `zod` | `^3.23.0` | Schema validation | — | ❌ **Unused** (hand-written validators at `checkout/page.tsx:36-59`) |
| 31 | `zustand` | `^4.5.0` | Client state | `apps/web/src/store/*.ts` + 9 consumers | ✅ **Load-bearing** |

**Score: 14 used, 3 partially used, 15 unused of 32 runtime dependencies (47 % dead).**

### Dev dependencies (`apps/web/package.json:46-63`) — 17 packages

| Package | Version | Purpose | Verdict |
|---------|---------|---------|---------|
| `@swc/core` | `^1.7.0` | SWC compiler for Jest | ⚠️ Referenced via `@swc/jest`, but the Jest config is broken |
| `@swc/jest` | `^0.2.0` | Jest transformer | ⚠️ `apps/web/jest.config.ts:7` misconfigures it — see [13, BUG-BUILD-02](./13-historical-bug-report.md) |
| `@testing-library/jest-dom` | `^6.4.0` | DOM matchers | ❌ **Never registered** — `apps/web/jest.config.ts:16` uses the non-existent key `setupFilesAfterFramework` instead of `setupFilesAfterEnv`, and passes `[]` anyway |
| `@testing-library/react` | `^16.0.0` | React test utils | ⚠️ Only `act` is imported (`cart-store.spec.ts:2`, `editor-store.spec.ts:2`); `render`/`screen` never used, so **no component is tested** |
| `@types/jest` | `^29.5.0` | Types | ✅ |
| `@types/node` | `^20.14.0` | Types | ✅ |
| `@types/react` | `^18.3.0` | Types | ✅ |
| `@types/react-dom` | `^18.3.0` | Types | ✅ |
| `autoprefixer` | `^10.4.0` | PostCSS plugin | ✅ `apps/web/postcss.config.js:4` |
| `eslint` | `^8.57.0` | Linter | ❌ **No config file exists** — `next lint` will prompt/fail |
| `eslint-config-next` | `^14.2.0` | Next lint rules | ❌ Same |
| `jest` | `^29.7.0` | Runner | ⚠️ Cannot start |
| `jest-environment-jsdom` | `^29.7.0` | jsdom env | ⚠️ Unreachable |
| `postcss` | `^8.4.0` | CSS pipeline | ✅ |
| `tailwindcss` | `^3.4.0` | CSS framework | ✅ |
| `typescript` | `^5.5.0` | Compiler | ✅ |

---

## 5.3 `apps/api` dependencies

### Runtime dependencies (`apps/api/package.json:18-43`) — 24 packages

| # | Package | Version | Purpose | Where used | Verdict |
|---|---------|---------|---------|-----------|---------|
| 1 | `@aws-sdk/client-s3` | `^3.600.0` | S3 operations | `apps/api/src/modules/assets/assets.service.ts:3-8,22,79-84` | ✅ Used |
| 2 | `@aws-sdk/s3-request-presigner` | `^3.600.0` | Presigned URLs | `apps/api/src/modules/assets/assets.service.ts:9,43` | ✅ Used |
| 3 | `@medusajs/medusa` | `^1.20.0` | Medusa server package | — | ❌ **Unused** (0 imports). This is a very heavy package to carry for nothing |
| 4 | `@medusajs/medusa-js` | `^6.1.0` | Medusa HTTP client | `apps/api/src/common/medusa/medusa.service.ts:3,10` | ⚠️ **Instantiated but no route reaches it** |
| 5 | `@nestjs/bull` | `^10.1.0` | Queue module | — | ❌ **Unused** — `BullModule` never imported in `app.module.ts` |
| 6 | `@nestjs/cache-manager` | `^2.2.0` | Cache module | — | ❌ **Unused** — `CacheModule` never registered |
| 7 | `@nestjs/common` | `^10.3.0` | Framework | All 20 source files | ✅ **Load-bearing** |
| 8 | `@nestjs/config` | `^3.2.0` | Env config | `apps/api/src/app.module.ts:2,14`; `medusa.service.ts:2,9`; `assets.service.ts:2,20` | ✅ Used |
| 9 | `@nestjs/core` | `^10.3.0` | Framework | `apps/api/src/main.ts:1,9` | ✅ **Load-bearing** |
| 10 | `@nestjs/platform-express` | `^10.3.0` | HTTP adapter | Implicit (`main.ts:9`) | ✅ **Load-bearing** |
| 11 | `@nestjs/swagger` | `^7.3.0` | OpenAPI | `apps/api/src/main.ts:3,32-39` + 6 controllers | ✅ Used |
| 12 | `@prisma/client` | `^5.17.0` | ORM client | `apps/api/src/common/prisma/prisma.service.ts:2`; `products.service.ts:3`; `prisma/seed.ts:1` | ✅ **Load-bearing** |
| 13 | `bull` | `^4.12.0` | Queue engine | — | ❌ **Unused** |
| 14 | `cache-manager` | `^5.7.0` | Cache abstraction | — | ❌ **Unused** |
| 15 | `cache-manager-redis-yet` | `^5.1.0` | Redis cache store | — | ❌ **Unused** |
| 16 | `class-transformer` | `^0.5.1` | DTO transformation | Required by `ValidationPipe({ transform: true })` (`main.ts:24`) | ⚠️ **Peer-required but no DTO class exists** — every request body is an inline TS interface, so validation is a no-op |
| 17 | `class-validator` | `^0.14.0` | DTO validation | Required by `ValidationPipe` | ⚠️ **Same — zero decorators in the codebase** |
| 18 | `compression` | `^1.7.4` | gzip responses | `apps/api/src/main.ts:5,13` | ✅ Used |
| 19 | `express-rate-limit` | `^7.3.0` | Rate limiting | — | ❌ **Unused**, despite `.github/copilot-instructions.md:673` claiming it is "already configured" |
| 20 | `helmet` | `^7.1.0` | Security headers | `apps/api/src/main.ts:4,12` | ✅ Used (default options only) |
| 21 | `reflect-metadata` | `^0.2.0` | Decorator metadata | Peer requirement | ✅ Required |
| 22 | `rxjs` | `^7.8.0` | Reactive streams | Peer requirement of NestJS | ✅ Required |
| 23 | `sharp` | `^0.33.0` | Image processing | — | ❌ **Unused.** Heavyweight native binary (~30 MB installed with libvips) for zero use |
| 24 | `uuid` | `^10.0.0` | ID generation | `apps/api/src/modules/assets/assets.service.ts:11,35`; `apps/api/tests/builders/index.ts:4` | ⚠️ Used, but **replaceable by the built-in `crypto.randomUUID()`** available since Node 14.17 — and `crypto` is already imported in this codebase (`auth.service.ts:8`) |

**Score: 12 used, 4 peer-required-but-inert, 8 unused of 24 runtime dependencies (33 % dead).**

### Dev dependencies (`apps/api/package.json:44-58`) — 14 packages

| Package | Version | Verdict |
|---------|---------|---------|
| `@nestjs/cli` | `^10.4.0` | ✅ `nest build`, `nest start --watch` |
| `@nestjs/schematics` | `^10.1.0` | ✅ `apps/api/nest-cli.json:3` |
| `@nestjs/testing` | `^10.4.22` | ✅ Every spec file uses `Test.createTestingModule` |
| `@types/compression` | `^1.7.0` | ✅ Resolves the `TS7016` recorded at `apps/api/.turbo/turbo-build.log:5-8` |
| `@types/express` | `^4.17.0` | ✅ Peer types |
| `@types/jest` | `^29.5.14` | ✅ |
| `@types/node` | `^20.14.0` | ✅ |
| `@types/uuid` | `^10.0.0` | ✅ |
| `jest` | `^29.7.0` | ✅ 146 tests pass |
| `prisma` | `^5.17.0` | ✅ CLI |
| `ts-jest` | `^29.4.11` | ✅ `apps/api/jest.config.ts:9-12` |
| `ts-node` | `^10.9.0` | ✅ `apps/api/package.json:16,60` (seed) |
| `typescript` | `^5.5.0` | ✅ |

---

## 5.4 `packages/types`

`packages/types/package.json:1-7` declares **no dependencies at all** — not even `typescript` or `jest`, despite `packages/types/jest.config.ts` requiring `ts-jest`. The suite only runs because npm workspaces hoists the root/api copies into the shared `node_modules`. This is an **implicit, undeclared dependency** and will break in isolation.

It also declares no `scripts` block, so `turbo run test` skips it entirely (`turbo.json:16-18` runs the `test` task, which does not exist here).

**Consumers: zero.** `@my-lovely-gift/types` is imported by no file in `apps/web/src` or `apps/api/src`. Both apps duplicate the same shapes locally (`apps/web/src/store/cart-store.ts:4-14`, `apps/api/tests/builders/index.ts:6-10`).

---

## 5.5 Consolidated findings

### Declared but imported nowhere (candidate removals)

| Package | Workspace | Approximate weight | Why it is there |
|---------|-----------|-------------------|-----------------|
| `@medusajs/medusa` | api | Very heavy (full commerce server) | Copied from a Medusa integration plan never executed |
| `sharp` | api | Heavy native (libvips) | Planned image processing (`copilot-instructions.md:926`) |
| `bull`, `@nestjs/bull` | api | Medium | Planned async jobs |
| `cache-manager`, `cache-manager-redis-yet`, `@nestjs/cache-manager` | api | Medium | Planned Redis caching |
| `express-rate-limit` | api | Light | Planned; doc falsely claims it is wired |
| `framer-motion` | web | Heavy | Animation solved with CSS instead |
| `zod`, `react-hook-form`, `@hookform/resolvers` | web | Medium | Validation hand-rolled instead; `QA_AUDIT_REPORT.md:133` recommends adopting them |
| `date-fns` | web | Medium | No date formatting exists in the UI |
| `@medusajs/medusa-js` | web | Medium | Frontend never calls Medusa |
| 9 × `@radix-ui/*` | web | Light each | Components hand-rolled instead |

**Total: 21 declared-but-unimported packages** across the two apps.

### Heavyweight dependencies used for trivial purposes

| Package | Used for | Lighter alternative already available |
|---------|----------|--------------------------------------|
| `uuid ^10.0.0` (api) | One call: `uuid()` in `assets.service.ts:35`, plus test builders | `crypto.randomUUID()` — Node built-in, and `crypto` is already imported at `auth.service.ts:8`. The frontend already does this (`cart-store.ts:35`) |
| `@radix-ui/react-slot` (web) | The `asChild` escape hatch on `Button`, which **no caller uses** | Delete the prop |
| `@tanstack/react-query` (web) | A provider wrapper with zero consumers | Delete `providers.tsx` |

### Duplicate packages solving the same problem

| Problem | Packages present | Actually used |
|---------|-----------------|---------------|
| Form validation | `zod`, `react-hook-form`, `@hookform/resolvers`, `class-validator`, `class-transformer` | **None** — hand-written in `checkout/page.tsx:36-59`, `register/page.tsx:25-33`, `auth.service.ts:90-92` |
| Unique IDs | `uuid` (api), `crypto.randomUUID` (web), `@default(uuid())` (Prisma) | All three, in different layers — inconsistent |
| Animation | `framer-motion`, `tailwindcss-animate`, hand-written CSS keyframes | Only the CSS keyframes |
| Modals/overlays | `@radix-ui/react-dialog`, hand-rolled fixed-position divs | Only hand-rolled |

### Transitive-but-load-bearing

| Package | Why it matters |
|---------|----------------|
| `earcut` | Declared as a direct dep (`apps/web/package.json:32`) but is functionally a **Babylon.js peer** — `MeshBuilder.ExtrudePolygon` requires it as its 4th argument (`product-3d.ts:266,347`). Removing it silently breaks the t-shirt and sticker meshes at runtime, not at compile time. It also needs the hand-written ambient declaration `apps/web/src/types/earcut.d.ts` because the package ships no types. |
| `reflect-metadata`, `rxjs` | NestJS decorator/DI machinery. Never imported by first-party code but non-optional. |
| `@swc/core` | Pulled in only as `@swc/jest`'s engine. |

### Version-range hygiene

Every dependency in all three manifests uses a **caret range** (`^`). There are no exact pins, no `~` ranges, and no `*`. Combined with a committed lockfile this is acceptable, but it means:
- `npm install` (as opposed to `npm ci`) can float minors — a real risk for `fabric ^6.0.0`, where a minor change to serialisation would corrupt saved designs.
- `minio/minio:latest` in `docker-compose.yml:36` is the one truly unpinned artifact in the stack.

### Licence obligations

`[UNVERIFIED: per-package licence text. I did not read any node_modules LICENSE file. The table below records the conventional licence of each load-bearing dependency for triage purposes only and must be confirmed with a real SCA tool before any distribution decision.]`

| Package | Conventional licence | Obligation class |
|---------|---------------------|------------------|
| `next`, `react`, `react-dom`, `zustand`, `axios`, `tailwindcss`, `@nestjs/*`, `@prisma/client`, `@aws-sdk/*`, `helmet`, `compression`, `uuid`, `earcut`, `clsx`, `tailwind-merge`, `sonner`, `class-variance-authority`, `@radix-ui/*` | MIT | Permissive — attribution only |
| `fabric` | MIT | Permissive |
| `@babylonjs/core` | Apache-2.0 | Permissive with patent grant + NOTICE requirement |
| `prisma` (CLI) | Apache-2.0 | Permissive |
| `@medusajs/medusa` | MIT | Permissive |
| `sharp` | Apache-2.0 (bundles libvips, LGPL-3.0) | **Requires attention if statically linked and redistributed** — but the package is unused, so removing it removes the question |

**No licence conflict is evident** for a private, non-distributed web application. The project's own `README.md:151-153` says "Private - All rights reserved" but **no `LICENSE` file exists**, which is itself a gap.

### Prioritised dependency actions

| Priority | Action | Effect |
|----------|--------|--------|
| **High** | Remove `@medusajs/medusa` and `sharp` from `apps/api` | Largest install-size reduction; both are 0-import native/server packages |
| **High** | Either register `CacheModule`/`BullModule`/`express-rate-limit`, or remove them and correct `.github/copilot-instructions.md:673,920,926` | The doc currently instructs future agents to rely on infrastructure that does not exist |
| **Medium** | Remove the 9 unused `@radix-ui/*` packages **or** adopt them to fix the accessibility findings in [17](./17-accessibility-findings.md) | Adopting is the better trade — the hand-rolled dialogs/menus are the source of most a11y violations |
| **Medium** | Remove `framer-motion`, `date-fns`, `@medusajs/medusa-js` (web) | Bundle size |
| **Medium** | Decide on `zod` + `react-hook-form`: adopt (as `QA_AUDIT_REPORT.md:133` recommends) or remove | Currently paying install cost for nothing while validation bugs recur |
| **Low** | Replace `uuid` with `crypto.randomUUID()` in `apps/api` | One dependency fewer, consistent with the frontend |
| **Low** | Add `typescript`, `jest`, `ts-jest`, `@types/jest` to `packages/types/package.json` and add a `test` script | Makes the package self-contained and visible to `turbo run test` |
| **Low** | Pin `minio/minio` to a digest or version tag in `docker-compose.yml:36` | Reproducibility |
