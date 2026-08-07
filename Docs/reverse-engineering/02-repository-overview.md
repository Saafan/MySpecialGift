# 02 — Repository Overview

[← Index](./00-index.md)

## Purpose, scope, domain

| Attribute | Value | Evidence |
|-----------|-------|----------|
| Name | `my-lovely-gift` | `package.json:2` |
| Version | `1.0.0` | `package.json:3` |
| Private | `true` (never published) | `package.json:4` |
| Description | "A Gen Alpha product customization & e-commerce platform with Canva-style editor" | `package.json:5` |
| Domain | Print-on-demand / custom merchandise e-commerce | `README.md:3` |
| Licence | "Private - All rights reserved." — no `LICENSE` file exists | `README.md:151-153` |

## Target platforms

**Web only.** There is no Android, iOS, macOS, Windows, Linux desktop, watchOS, tvOS, or browser-extension code anywhere in the tree.

- No `AndroidManifest.xml`, `build.gradle`, `Info.plist`, `Podfile`, `Package.swift`, `*.csproj`, `manifest.json` (extension), or `electron` dependency exists — verified against the full recursive census.
- The only runtime targets are a browser (Next.js 14 App Router, `apps/web/package.json:36`) and Node.js ≥ 20 (`package.json:32-34`).
- Browser support is implied by the Babylon.js WebGL requirement (`apps/web/src/lib/product-3d.ts:438-448`) and `target: "ES2022"` (`apps/web/tsconfig.json:3`). No `browserslist` key exists in any `package.json`, so Next.js defaults apply. `[UNVERIFIED: the exact supported browser matrix — no browserslist config, no BrowserslistError, and no polyfill config exists to read.]`

**Sections declared "Not present" for platform work:** Android, iOS, other native platforms, platform channels / FFI / JNI bridges, app-store distribution metadata, code signing.

## Deployment model

Container-based, defined but **not proven to work**:

- `docker-compose.yml:1-119` defines six services: `postgres` (16-alpine, host port **5433**), `redis` (7-alpine, 6379), `minio` (latest, 9000/9001), `medusa` (node:20-alpine, 9000, profile `medusa`), `api` (built from `docker/Dockerfile.api`, 4000, profile `app`), `web` (built from `docker/Dockerfile.web`, 3000, profile `app`).
- **Port collision:** `minio` binds host `9000:9000` (`docker-compose.yml:42`) and `medusa` also binds host `9000:9000` (`docker-compose.yml:64`). Both cannot run simultaneously. They are on different Compose profiles (`medusa` vs none), which partially masks it, but `.env.example:12` and `.env.example:17` both point at `localhost:9000` for two different services.
- **`Dockerfile.web` is broken as written.** It copies `/app/.next/standalone` (`docker/Dockerfile.web:22`) and runs `node server.js` (`docker/Dockerfile.web:29`), but `apps/web/next.config.js:1-18` does not set `output: "standalone"`, so that directory is never produced.
- **`Dockerfile.api` build context is wrong for a workspace.** `docker-compose.yml:76` sets `context: ./apps/api`, and `docker/Dockerfile.api:5-6` runs `COPY package.json package-lock.json* ./` then `npm ci`. There is no `package-lock.json` in `apps/api` (the only lockfile is at the repo root, `package-lock.json`, 844,854 bytes), so `npm ci` will fail for lack of a lockfile.
- No Kubernetes manifests, Helm charts, Terraform, Pulumi, CloudFormation, CDK, serverless config, nginx/Apache config, or Vercel/Netlify/Firebase config exists. **Not present.**

## Activity level and maturity

There is no commit history to measure activity from. The available proxy is filesystem timestamps:

| Signal | Value |
|--------|-------|
| Earliest directory creation | `apps/`, `packages/`, `docker/` — 2026-05-30 |
| Design-system generation stamp | 2026-05-30 20:09:40 (`design-system/mylovelygift/MASTER.md:10`) |
| Prisma migration timestamp | `20260530232216_init` — the only migration ever created |
| QA audit report date | 2026-05-31 (`QA_AUDIT_REPORT.md:3`) |
| Deep QA test report date | 2026-05-31 (`TEST_REPORT.md:3`) |
| Latest browser-automation artifact | `.playwright-cli/console-2026-06-21T15-37-02-103Z.log` |
| Latest `package-lock.json` write | 2026-06-10 |
| Latest `package.json` write | 2026-08-07 (the day of this audit) |

**Reading:** intense build activity 2026-05-30 → 2026-06-21 (roughly three weeks), then dormancy. Maturity is **prototype / pre-alpha**: one database migration, no CI, no releases, no changelog, no tags.

## Coverage statement

### File census

Counted with `Get-ChildItem -Recurse -File -Force`, excluding `node_modules` only.

| Region | Files | Bytes | Read policy applied |
|--------|------:|------:|---------------------|
| `apps/web/.next/` | 547 | 133,403,561 | **Catalogued, not read** — Next.js build output, gitignored (`.gitignore:10`), regenerable |
| `.playwright-cli/` | 251 | 28,502,756 | **Catalogued, not read** — browser-automation artifacts (PNG/YAML/log), gitignored (`.gitignore:42`) |
| `apps/api/dist/` | 145 | 1,102,103 | **Catalogued, not read** — `nest build` output, gitignored (`.gitignore:15`) |
| `.playwright-mcp/` | 101 | 2,701,706 | **Catalogued, not read** — browser-automation artifacts; **NOT gitignored** |
| `apps/web/src/` | 37 | ~200 KB | **Read in full (37/37)** |
| `.github/` | 35 | ~718 KB | 3 read in full, 32 catalogued (see below) |
| `apps/web/public/` | 30 | 5,553,777 | 26 SVGs read in full; 4 binaries catalogued |
| Root files | 25 | ~3.1 MB | 11 read in full, 14 catalogued (PNG screenshots) |
| `apps/api/src/` | 24 | ~28 KB | **Read in full (24/24)** |
| `apps/api/tests/` | 23 | ~104 KB | 8 read in full; 15 read structurally (full `describe`/`it` inventory extracted with line numbers) |
| `apps/web/tests/` | 4 | ~33 KB | **Read in full (4/4)** |
| `apps/api/prisma/` | 4 | ~24 KB | **Read in full (4/4)** |
| `packages/types/` | 4 | ~10 KB | **Read in full (4/4)** |
| `docker/` | 2 | 1,001 | **Read in full (2/2)** |
| `e2e/` | 2 | 48,453 | **Read in full (2/2)** |
| `.cursor/` | 2 | 2,965 | **Read in full (2/2)** |
| `design-system/` | 1 | 5,375 | **Read in full (1/1)** |
| Misc `apps/*` config | 16 | ~280 KB | 14 read in full; `apps/web/tsconfig.tsbuildinfo` and the two `.turbo/turbo-build.log` files read as artifacts |
| **TOTAL (excl. `node_modules`)** | **1,253** | **~175 MB** | |
| `node_modules/` | not counted | — | 982 top-level packages installed; **not inspected**, dependency facts taken from manifests and `package-lock.json` |

### Precisely what I did not fully read, and why

| Path / group | Count | Justification |
|--------------|------:|---------------|
| `apps/web/.next/**` | 547 | Generated build output. Contains minified JS, `.map`, `.gz`, and webpack chunk manifests. Regenerable by `next build`. Two artifacts *were* read for evidence: `apps/web/.turbo/turbo-build.log`. |
| `apps/api/dist/**` | 145 | Generated `tsc` output mirroring `apps/api/src/**`, which was read in full. |
| `.playwright-cli/**` | 251 | Test-run artifacts: 92 PNG screenshots, ~130 accessibility-snapshot `.yml` files, ~30 console `.log` files. Filenames were catalogued (they are strong historical evidence — see [13](./13-historical-bug-report.md#41--timeline-reconstructed-without-git)); contents sampled only. Several exceed 1 MB (`console-2026-06-21T14-15-51-927Z.log` is 1,268,505 bytes). |
| `.playwright-mcp/**` | 101 | Same category, from an earlier Playwright-MCP-based workflow. |
| Root `*.png` | 14 | Binary screenshots (2,196,370 bytes total). Catalogued in [90](./90-file-inventory.md#root-level-binary-artifacts). |
| `apps/web/public/3d/*.jpg`, `*.env` | 4 | Binary 3D assets (5,531,629 bytes). Catalogued with byte size and usage sites; contents are image/IBL data. |
| `.github/prompts/ui-ux-pro-max/data/*.csv` | 24 | Vendored third-party reference dataset (~430 KB) for a design-recommendation tool. Column schemas read from `.github/prompts/ui-ux-pro-max/scripts/core.py:17-61`; row contents not read. |
| `.github/prompts/ui-ux-pro-max/scripts/__pycache__/*.pyc` | 5 | Compiled Python bytecode (164,741 bytes), checked into the tree. Binary. |
| `.github/prompts/ui-ux-pro-max/scripts/design_system.py` | 1 | 43,614 bytes of vendored generator code; read structurally via its public entry points as used by `search.py:21,76-83`. |
| `apps/api/tests/unit/**` (15 of 23) | 15 | Read structurally: complete `describe`/`it` inventory with line numbers extracted and reproduced in [12](./12-feature-inventory.md#test-coverage-map). The 8 highest-signal files (all mocks/fixtures/builders, `auth.service.spec.ts`, `orders.service.spec.ts`, `designs.service.spec.ts`, `assets.service.spec.ts`, `order-business-rules.spec.ts`) were read line-by-line. |
| `apps/web/tsconfig.tsbuildinfo` | 1 | 273,600-byte incremental-compilation cache. Machine-generated. |
| `package-lock.json` | 1 | 844,854 bytes. Read structurally: registry, integrity scheme, and absence of `overrides`/`resolutions`/`patchedDependencies` verified. Individual transitive entries not enumerated. |
| `node_modules/**` | ~982 packages | Third-party installed code. |

**Nothing else was skipped.** Every first-party `.ts`, `.tsx`, `.js`, `.css`, `.json`, `.prisma`, `.sql`, `.yml`, `.md`, `.mdc`, `.toml`, and dotfile in the tree was opened and read end to end.

## Ignore rules (Phase 0.2)

The only ignore file in the repository is `.gitignore`. There is **no** `.dockerignore`, `.eslintignore`, `.prettierignore`, `.npmignore`, or `.gcloudignore`.

| `.gitignore` line | Pattern | What it excludes | Why it matters |
|---|---|---|---|
| 2-4 | `node_modules/`, `.pnp`, `.pnp.js` | Dependencies | Normal |
| 7 | `coverage/` | Jest coverage output | Normal; note no coverage report exists in the tree |
| 10-11 | `.next/`, `out/` | Next build output | Normal — but 547 files / 133 MB are physically present in the working tree |
| 14-15 | `build/`, `dist/` | Compiled output | Normal — 145 files present in `apps/api/dist` |
| 19 | `*.pem` | Private keys | Good hygiene; no `.pem` exists |
| 20 | `*.log` | All logs | **Side effect:** this also excludes `apps/*/.turbo/turbo-build.log`, which are the only build-failure records in the repo |
| 28-30 | `.env`, `.env*.local`, `!.env.example` | Runtime secrets | Correct pattern. `apps/api/.env` and `apps/web/.env.local` exist in the working tree and *would* be excluded |
| 41-42 | `.vscode/settings.json`, `.playwright-cli/` | Editor + browser artifacts | `.playwright-cli/` is ignored, **`.playwright-mcp/` is not** — 101 files / 2.7 MB would be committed |
| 45 | `docker/volumes/` | Local volume data | Directory does not exist |
| **48** | **`apps/api/prisma/migrations/`** | **Prisma migration history** | **Defect.** This directly contradicts `.github/copilot-instructions.md:229` ("Prisma migration history (never edit manually)") and `apps/api/prisma/migrations/migration_lock.toml:2` which literally says *"It should be added in your version-control system (i.e. Git)"*. Excluding migrations makes schema state unreproducible across environments. |
| 51-52 | `Thumbs.db`, `Desktop.ini` | Windows cruft | Normal |

### Ignored-but-present artifacts in the working tree

| Path | Files | Bytes | Ignored by |
|------|------:|------:|-----------|
| `apps/web/.next/` | 547 | 133,403,561 | `.gitignore:10` |
| `apps/api/dist/` | 145 | 1,102,103 | `.gitignore:15` |
| `.playwright-cli/` | 251 | 28,502,756 | `.gitignore:42` |
| `apps/api/.env` | 1 | 527 | `.gitignore:28` — **contains credentials**, see [16](./16-security-findings.md) |
| `apps/web/.env.local` | 1 | 81 | `.gitignore:29` |
| `apps/web/tsconfig.tsbuildinfo` | 1 | 273,600 | `.gitignore:36` |
| `apps/web/next-env.d.ts` | 1 | 233 | `.gitignore:37` |
| `apps/*/.turbo/turbo-build.log` | 2 | 2,386 | `.gitignore:20` |

### Not-ignored artifacts that probably should be

| Path | Files | Bytes | Note |
|------|------:|------:|------|
| `.playwright-mcp/` | 101 | 2,701,706 | Test artifacts including 353 KB PNGs |
| Root `*.png` | 14 | 2,196,370 | `test-homepage.png` (284,881 B), `final-test.png`, `products-page.png`, etc. |
| `.github/prompts/ui-ux-pro-max/scripts/__pycache__/` | 5 | 164,741 | Compiled Python bytecode |

## Repository fingerprint (Phase 0.3)

| Question | Answer | Evidence |
|----------|--------|----------|
| Monorepo or single project? | **Monorepo** | `package.json:6-9` declares `workspaces: ["apps/*", "packages/*"]` |
| Workspace tooling | **npm workspaces + Turborepo 2.x** | `package.json:6-9`, `package.json:29` (`"turbo": "^2.1.0"`), `turbo.json:1-20` |
| Package manager | **npm 10.0.0**, pinned | `package.json:35` (`"packageManager": "npm@10.0.0"`) |
| Lockfile | Single root `package-lock.json`, lockfileVersion 3 | 844,854 bytes at repo root |
| Deployable artifacts | **2** (`apps/web`, `apps/api`) | `docker-compose.yml:74-114` |
| Publishable artifacts | **0** — all three packages are `"private": true` | `package.json:4`, `apps/web/package.json:4`, `apps/api/package.json:4`, `packages/types/package.json:4` |
| Turbo pipeline tasks | `build` (depends on `^build`, outputs `.next/**`, `!.next/cache/**`, `dist/**`), `lint` (depends on `^build`), `dev` (uncached, persistent), `test` (depends on `^build`) | `turbo.json:4-19` |
| Turbo global deps | `**/.env.*local` | `turbo.json:3` |

### Language breakdown (first-party files only, excluding build output and test artifacts)

| Language | Files | Notes |
|----------|------:|-------|
| TypeScript (`.ts`) | 55 | API source 24, API tests 23, web lib/store/types 12 (minus overlaps), configs, e2e |
| TypeScript React (`.tsx`) | 22 | 14 pages/layout, 8 components |
| SVG | 26 | All in `apps/web/public/` |
| JSON | 12 | `package.json` ×4, `tsconfig.json` ×3, `turbo.json`, `nest-cli.json`, plus lockfile |
| Markdown | 8 | `README.md`, `TEST_REPORT.md`, `QA_AUDIT_REPORT.md`, `copilot-instructions.md`, `MASTER.md`, `SKILL.md`, `PROMPT.md`, `deep-test-report.prompt.md` |
| Python | 3 | Vendored `ui-ux-pro-max` tooling |
| JavaScript (`.js`) | 2 | `next.config.js`, `postcss.config.js` |
| CSS | 1 | `apps/web/src/app/globals.css` |
| Prisma schema | 1 | `apps/api/prisma/schema.prisma` |
| SQL | 1 | `apps/api/prisma/migrations/20260530232216_init/migration.sql` |
| YAML | 1 | `docker-compose.yml` |
| TOML | 1 | `migration_lock.toml` |
| MDC (Cursor rule) | 1 | `.cursor/rules/browser-testing.mdc` |
| CSV (vendored data) | 24 | `.github/prompts/ui-ux-pro-max/data/` |

**Primary language: TypeScript**, by a wide margin — 77 of ~100 first-party code files.

## Triage strategy applied (Phase 0.5)

- **(a) Read in full:** all first-party source, all configs, all scripts, all infra, all docs, all SVG assets. 100% of this category was read.
- **(b) Read structurally:** `package-lock.json` (dependency graph + integrity + absence of overrides), 15 API controller/service specs (test-name inventory with line numbers), `design_system.py`, the 24 vendored CSVs (schema only), the two `.turbo/turbo-build.log` files (read fully — they are only 1,959 and 427 bytes and contain critical historical evidence).
- **(c) Catalogued, not read:** all binaries — 92+14+ PNG screenshots, 3 JPGs, 1 `.env` IBL cube map, 5 `.pyc` files, and all generated build output. Every catalogued asset has its byte size, format, and referencing code site recorded in [90 — Full File Inventory](./90-file-inventory.md).
- **No fourth "ignore" category was used.**

## Git & version-control metadata (Phase 1.10)

**Not present, in its entirety.**

- No `.git` directory. `git -C "D:\Tools\MyLovelyGift" rev-parse --is-inside-work-tree` → `fatal: not a git repository (or any of the parent directories): .git`.
- Therefore: no branches, no default branch, no tags, no release cadence, no submodules, no subtrees, no Git LFS config, no `.git/hooks`, no managed hook directory (`.husky/` does not exist).
- No `.gitattributes`, no `CODEOWNERS`, no `.mailmap`.
- No `.github/workflows/`, no `.github/ISSUE_TEMPLATE/`, no `.github/PULL_REQUEST_TEMPLATE.md`. The only `.github` content is `copilot-instructions.md` and the `prompts/` directory.
- No `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `LICENSE`, `CHANGELOG.md`, `ARCHITECTURE.md`, `AGENTS.md`, `CLAUDE.md`, `.editorconfig`, `.nvmrc`, `.tool-versions`, or ADR directory.
- Present editor/agent config: `.cursor/rules/browser-testing.mdc` and `.cursor/skills/playwright-cli/SKILL.md`.
