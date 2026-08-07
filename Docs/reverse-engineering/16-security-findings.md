# 16 — Security Findings

[← Index](./00-index.md)

**All secret values in this document are redacted.** Where a credential exists in the tree, only its file, line, variable name, and type are recorded.

**Method and limits.** These findings come from reading source. I did **not** run the application, did not send any request, and did not run `npm audit` or any SCA tool. `[UNVERIFIED: known CVEs in the 1,648 locked dependencies — no vulnerability database was consulted. Resolving this requires a network-enabled SCA scan.]`

Severity uses CVSS-style reasoning: impact × exploitability, adjusted for whether the affected path is reachable in the current build.

---

## Severity summary

| Severity | Count | IDs |
|----------|------:|-----|
| 🔴 Critical | 4 | SEC-01, SEC-02, SEC-03, SEC-04 |
| 🟠 High | 7 | SEC-05 … SEC-11 |
| 🟡 Medium | 9 | SEC-12 … SEC-20 |
| 🟢 Low / informational | 8 | SEC-21 … SEC-28 |

---

## 🔴 Critical

### SEC-01 — No authentication enforcement anywhere in the API

**Affected:** every one of the 20 endpoints in `apps/api/src/modules/**`.

**Finding.** `AuthService.generateToken` issues a token (`apps/api/src/modules/auth/auth.service.ts:110-121`). **No code in the repository ever verifies one.** There is no `verifyToken` function, no `@nestjs/passport`, no `AuthGuard`, no class implementing `CanActivate`, no `APP_GUARD` provider, and no middleware. `apps/api/src/main.ts:1-47` registers exactly three pieces of middleware — `helmet()`, `compression()`, and a `ValidationPipe` — and no guard.

The frontend does send the token: `apps/web/src/lib/api.ts:19` sets `Authorization: Bearer <token>`. The server reads that header nowhere.

**Attack scenario.**
```
POST /api/v1/designs
Content-Type: application/json
x-user-id: <any user's uuid>
x-tenant-id: default

{"name":"x","canvasData":{}}
```
No `Authorization` header is required. The request succeeds.

**Impact.** Total compromise of the data model. Combined with SEC-02, an unauthenticated attacker reads, modifies, and deletes any user's designs and orders.

**Remediation.** Implement `verifyToken` as the inverse of `generateToken` (recompute the HMAC over the decoded payload and compare with `timingSafeEqual`), add an `exp` claim, and register a global `AuthGuard` via `APP_GUARD` with an `@Public()` decorator for `/auth/login` and `/auth/register`. Then derive `userId` from the verified token and delete every `@Headers("x-user-id")` parameter.

---

### SEC-02 — Identity is a client-supplied header (IDOR on every user-owned resource)

**Affected:** `apps/api/src/modules/designs/designs.controller.ts:21,29,38,49,57,67`; `apps/api/src/modules/orders/orders.controller.ts:12,20,39`; `apps/api/src/modules/assets/assets.controller.ts:30`.

**Finding.** Ownership is checked — and the checks are correct in form:

```19:21:apps/api/src/modules/designs/designs.service.ts
    if (!design || design.userId !== userId) {
      throw new NotFoundException("Design not found");
    }
```
```29:31:apps/api/src/modules/orders/orders.service.ts
    if (!order || order.userId !== userId) {
      throw new NotFoundException("Order not found");
    }
```

But `userId` originates from `@Headers("x-user-id") userId: string`. It is attacker-controlled.

**Attack scenario.** An attacker registers, obtains their own `user_id`, then enumerates or guesses another user's uuid (or obtains one from any error message, log, or shared link) and replays every design and order endpoint with that value in `x-user-id`. `DELETE /api/v1/designs/:id` with a forged header destroys another user's work.

**Aggravating factor.** The `NotFoundException`-instead-of-`Forbidden` pattern is good practice for avoiding existence leaks — it makes the *authorization* logic sound. Only the *authentication* is missing, which makes the sound logic worthless.

**Remediation.** As SEC-01. `x-user-id` must not be an input.

---

### SEC-03 — Order prices are supplied by the client

**Affected:** `apps/api/src/modules/orders/orders.controller.ts:33`; `apps/api/src/modules/orders/orders.service.ts:47-53`.

**Finding.**

```28:38:apps/api/src/modules/orders/orders.controller.ts
    @Body()
    body: {
      items: Array<{
        designId: string;
        quantity: number;
        unitPrice: number;
        options?: Record<string, string>;
      }>;
      // ...
    },
```
```47:53:apps/api/src/modules/orders/orders.service.ts
    const subtotal = data.items.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );
    const tax = subtotal * 0.1; // 10% tax
    const shippingCost = subtotal > 50 ? 0 : 5.99;
    const total = subtotal + tax + shippingCost;
```

`unitPrice` is never cross-referenced against `products.basePrice` or `product_variants.price`. Both columns exist (`apps/api/prisma/schema.prisma:61,92`) and are never read by the orders module.

**Attack scenario.** `POST /api/v1/orders` with `{"items":[{"designId":"<id>","quantity":1,"unitPrice":0.01}]}` creates an order with `subtotal: 0.01`, `total: 6.00`. With a negative `unitPrice` the subtotal goes negative, and because the shipping test is `subtotal > 50`, shipping is still charged — producing a nonsensical but persisted financial record.

**Aggravating factor.** The global `ValidationPipe` (`main.ts:20-26`) is configured with `whitelist: true, forbidNonWhitelisted: true`, which *would* strip unknown fields — but it has no metadata to work from because the body is typed with an inline TypeScript interface rather than a decorated DTO class. **The validation is entirely inert.**

**Remediation.** Look up the authoritative price server-side from `designId → productId → product/variant`. Add a `CreateOrderDto` class with `class-validator` decorators so the pipe actually engages.

---

### SEC-04 — `DELETE /assets/:id` has no ownership check at all

**Affected:** `apps/api/src/modules/assets/assets.controller.ts:40-44`; `apps/api/src/modules/assets/assets.service.ts:75-87`.

**Finding.** The route takes no `x-user-id` and no `x-tenant-id`. The service loads the asset by primary key, deletes the S3 object, and deletes the row:

```75:87:apps/api/src/modules/assets/assets.service.ts
  async delete(id: string) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset) return;

    await this.s3.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: asset.s3Key,
      })
    );

    return this.prisma.asset.delete({ where: { id } });
  }
```

**Attack scenario.** Any caller who can enumerate or guess an asset uuid permanently destroys the underlying S3 object and its database row, cross-tenant. There is no soft delete and no recovery.

**Remediation.** Require an authenticated principal; verify `asset.uploadedBy === userId` or that the caller holds an admin role for `asset.tenantId`.

---

## 🟠 High

### SEC-05 — Credentials present in the working tree

| File | Line | Variable | Type | Value |
|------|-----:|----------|------|-------|
| `apps/api/.env` | 5 | `JWT_SECRET` | HMAC signing key | **[REDACTED]** |
| `apps/api/.env` | 6 | `COOKIE_SECRET` | Cookie signing key | **[REDACTED]** |
| `apps/api/.env` | 9 | `AWS_ACCESS_KEY_ID` | S3 access key | **[REDACTED]** |
| `apps/api/.env` | 10 | `AWS_SECRET_ACCESS_KEY` | S3 secret key | **[REDACTED]** |
| `apps/api/.env` | 2 | `DATABASE_URL` | Postgres connection string with inline password | **[REDACTED]** |
| `.env.example` | 6 | `DB_PASSWORD` | Database password | **[REDACTED]** |
| `.env.example` | 13 | `JWT_SECRET` | HMAC signing key | **[REDACTED]** |
| `.env.example` | 14 | `COOKIE_SECRET` | Cookie signing key | **[REDACTED]** |
| `.env.example` | 19-20 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | S3 credentials | **[REDACTED]** |
| `.env.example` | 25-26 | `MINIO_ROOT_USER`, `MINIO_ROOT_PASSWORD` | MinIO admin credentials | **[REDACTED]** |
| `.env.example` | 5 | `DATABASE_URL` | Connection string with inline password | **[REDACTED]** |
| `docker-compose.yml` | 8, 39-40, 59-62, 84-85 | `POSTGRES_PASSWORD`, `MINIO_ROOT_*`, `JWT_SECRET`, `COOKIE_SECRET`, `AWS_*` | Compose defaults via `${VAR:-default}` | **[REDACTED]** |

**Mitigating factors.** `.gitignore:28` excludes `.env`, so `apps/api/.env` would not be committed. The `.env.example` values are self-describing local-development placeholders and two of them literally instruct the reader to change them before production. There is **no** cloud credential, no API key for a third-party SaaS, no private key file (`*.pem` is gitignored at `.gitignore:19` and none exists), and no token in source code.

**Why this is still High.** Two reasons:

1. **There is no git repository.** The `.gitignore` protection is currently hypothetical. Whoever initialises version control must confirm `apps/api/.env` is excluded *before* the first `git add`.
2. **`AuthService.generateToken` falls back to a secret published in this repository** when `JWT_SECRET` is unset:
   ```117:117:apps/api/src/modules/auth/auth.service.ts
     .createHmac("sha256", process.env.JWT_SECRET || "dev-secret-key")
   ```
   A deployment that forgets to set the variable signs every token with a value an attacker can read here. There is no startup assertion that required secrets are present.

**Remediation.** Fail fast at boot if `JWT_SECRET` is unset; remove the `|| "dev-secret-key"` fallback; replace the placeholder values in `.env.example` with obvious sentinels such as `<CHANGE_ME>`; add a secret-scanning pre-commit hook when git is initialised.

---

### SEC-06 — `ValidationPipe` validates nothing (no DTO classes exist)

**Affected:** all 20 endpoints.

**Finding.** `main.ts:20-26` configures the pipe correctly. But `class-validator`'s whitelist logic is driven by decorator metadata on a class, and **there is not one decorated DTO in the repository.** Every `@Body()` is typed with an inline interface (`auth.controller.ts:18,41`; `designs.controller.ts:37,47`; `orders.controller.ts:28-38`; `assets.controller.ts:13,22-29`), and TypeScript interfaces are erased at compile time.

**Consequences.** No type coercion, no length limits, no format checks, no whitelist stripping, no `forbidNonWhitelisted` rejection. Every endpoint accepts arbitrary JSON of arbitrary size. This is the enabling condition for SEC-03 and SEC-08.

**Remediation.** Create DTO classes with `class-validator` decorators for all 8 request bodies. Add `@nestjs/swagger`'s `@ApiProperty` at the same time so the OpenAPI document gains real schemas.

---

### SEC-07 — No rate limiting on authentication (or anything else)

**Affected:** `apps/api/src/main.ts`; `POST /auth/login`, `POST /auth/register`.

**Finding.** `express-rate-limit ^7.3.0` is a declared dependency (`apps/api/package.json:37`) and is **never imported**. `.github/copilot-instructions.md:673` states *"Use `express-rate-limit` (already configured)"* — that statement is false and will mislead future contributors.

**Aggravating factor — this is also a DoS vector.** `AuthService.verifyPassword` calls `crypto.scryptSync` (`auth.service.ts:37`), which is **synchronous** and blocks the Node event loop with default cost parameters (N=16384, r=8, p=1) — on the order of tens of milliseconds per call. Unlimited concurrent login attempts against a single-threaded process is a cheap denial of service, independent of whether any credential is guessed.

**Attack scenarios.** (a) Unlimited credential stuffing. (b) Unlimited account creation. (c) Event-loop exhaustion via repeated `POST /auth/login` with any password.

**Remediation.** Register `express-rate-limit` globally with a stricter bucket on `/auth/*`; switch to the async `crypto.scrypt` or to `argon2`/`bcrypt` with a worker pool.

---

### SEC-08 — Unbounded request bodies and unbounded queries

**Affected:** `POST /designs`, `PUT /designs/:id`, `POST /orders`, `GET /products`, `GET /templates/*`, `GET /designs`, `GET /orders`.

**Findings.**
- `canvasData: any` (`designs.controller.ts:37,47`) has no size cap. Express's default JSON limit is 100 KB, but that limit is **not configured here** and Nest does not raise it — so the default applies by accident, not by design. `[UNVERIFIED: the exact effective body limit at runtime — I did not start the server. The structural point stands: no explicit limit is set.]`
- `GET /products?limit=999999` is accepted. `products.service.ts:40` uses `take: params?.limit || 20` with **no maximum**, contradicting `.github/copilot-instructions.md:603` ("Maximum limit: 100").
- `GET /designs` (`designs.service.ts:9-12`), `GET /orders` (`orders.service.ts:13-17`), `GET /templates/categories` (`templates.service.ts:9-12`), and the nested `designTemplates` in `findCategoryBySlug` (`templates.service.ts:18-23`) have **no pagination at all**.
- `parseInt("abc", 10)` yields `NaN`, which Prisma rejects with an unhandled error → 500 with a stack trace (no exception filter exists).

**Remediation.** Cap `limit` at 100; paginate the four unbounded endpoints; validate numeric query params in a DTO; add a global exception filter.

---

### SEC-09 — No global exception filter — internal errors leak to clients

**Affected:** the whole API.

**Finding.** `apps/api/src/main.ts` registers no `ExceptionFilter`. Any unhandled throw — a Prisma `PrismaClientKnownRequestError`, an S3 `NoSuchBucket`, a `NaN` in a `take` clause, a JSON parse failure — propagates to Nest's default handler, which in a non-production `NODE_ENV` includes the message and stack.

**Attack scenario.** An attacker sends `GET /products?limit=abc` and reads the Prisma error, which discloses the query shape, model names, and potentially the connection target.

**Remediation.** Add a global filter that maps known error classes to sanitised responses and logs the detail server-side.

---

### SEC-10 — No structured logging, and therefore no audit trail

**Affected:** the whole backend.

**Finding.** The only logging in `apps/api/src` is two `console.log` startup banners (`main.ts:43-44`) and a `console.error` in the seed script (`prisma/seed.ts:236`). There is **no** request log, no auth-event log, no error log, no correlation id, and no NestJS `Logger` instance anywhere.

**Consequence.** A successful exploitation of SEC-01 through SEC-04 leaves **no trace whatsoever**. Post-incident forensics would be impossible.

**Note — the positive side.** Because nothing is logged, there is **no PII or secret leakage into logs**. The audit for that (a required check) returns clean: no password, token, email, address, or card value is written to any log. `apps/web/src/components/editor/editor-toolbar.tsx:60` has one `console.error("Failed to add to cart:", err)` — the error object may contain a serialised canvas but no credential.

**Remediation.** Adopt the NestJS `Logger` with a correlation-id interceptor; log auth successes and failures; explicitly deny-list password, token, and address fields.

---

### SEC-11 — Client-side-only authorization on `/my-designs`

**Affected:** `apps/web/src/app/(shop)/my-designs/page.tsx:55`.

**Finding.**
```55:55:apps/web/src/app/(shop)/my-designs/page.tsx
  const isAuthenticated = typeof window !== "undefined" && localStorage.getItem("auth_token");
```
Presence-only. Any non-empty string passes. This was the fix for BUG #4 (`QA_AUDIT_REPORT.md:58-64`).

**Attack scenario.** `localStorage.setItem("auth_token","anything")` in DevTools.

**Practical impact today: low** — the page only reads `localStorage`, which the "attacker" already owns. **Impact if the page is wired to the API as intended: critical**, because it would then be the only gate in front of endpoints that have none of their own.

**Also note:** `/cart`, `/checkout`, and `/editor/*` have **no gate at all**. Checkout completes with no session.

**Remediation.** Move the decision server-side. Add `next/middleware` for protected paths and validate the token against the API.

---

## 🟡 Medium

### SEC-12 — Path-traversal-shaped input flows into S3 object keys unsanitised

`apps/api/src/modules/assets/assets.service.ts:35`:
```35:35:apps/api/src/modules/assets/assets.service.ts
    const key = `${tenantId || "global"}/${uuid()}/${filename}`;
```
`filename` is raw client input (`assets.controller.ts:13`). `assets.service.spec.ts:69-83` explicitly asserts that `"my file (1).png"` and `"日本語.png"` pass through verbatim, confirming there is no sanitiser.

S3 treats `/` as a literal key character, so `../` does not escape a bucket the way it would on a filesystem — but it does produce confusing keys, and the uuid segment prevents collision. **The real risk is downstream:** any future consumer that maps the key onto a local path, a CDN rewrite rule, or a `Content-Disposition` filename inherits the injection. A `filename` of `x.png"; filename="evil.exe` would corrupt a naive header.

**Remediation.** Sanitise to `[A-Za-z0-9._-]`, cap the length, and preserve the extension explicitly.

### SEC-13 — No MIME or size enforcement on uploads (server side)

`getUploadUrl` (`assets.service.ts:37-45`) puts the client's `mimeType` straight into `PutObjectCommand.ContentType` with **no allow-list**, and sets no `ContentLength` constraint on the presigned URL. `confirmUpload` (`:50-73`) accepts an arbitrary `s3Key` and `size` with no verification that the object exists, that it is the object that was signed, or that the size is truthful.

The only validation is client-side (`editor-left-panel.tsx:174-175`) and trivially bypassed. `validationRules.maxFileSize` is seeded per category (`seed.ts:38,59,80,101`) and **read by nothing**.

**Attack scenario.** Obtain a presigned URL for `evil.html` with `ContentType: text/html`, upload it, then serve it from the CDN origin — a stored-XSS vector if the bucket is web-facing on the same origin as the app.

### SEC-14 — Registration is an account-enumeration oracle

`auth.service.ts:86-88` throws `409 ConflictException("An account with this email already exists")`. Login correctly uses one message for both failure modes (`:105`), but registration discloses membership.

**Remediation.** Return a generic success and send a "this address is already registered" email out-of-band.

### SEC-15 — Tenant isolation is not enforced on three endpoints

| Endpoint | Scoping |
|----------|---------|
| `GET /products/:id` | **None** — `products.service.ts:50-62` looks up by PK only |
| `GET /templates/designs/:categoryId` | **None** — no `x-tenant-id` parameter (`templates.controller.ts:25-38`) |
| `GET /templates/design/:id` | **None**, and **no visibility filter** — `templates.service.ts:46-51` returns `PRIVATE` and `MERCHANT` templates to anyone with the id |

Additionally, `Design` has **no `tenantId` column** (`schema.prisma:186-201`), so designs are not tenant-isolated at the data layer at all.

### SEC-16 — Helmet runs with defaults; no CSP, no HSTS tuning

`main.ts:12` is bare `app.use(helmet())`. Helmet's default `contentSecurityPolicy` is applied to API responses, which is fine — but **the Next.js frontend has no security headers at all**: `apps/web/next.config.js:1-18` defines no `headers()` function, so there is no CSP, no `X-Frame-Options`, no `Referrer-Policy`, and no `Permissions-Policy` on any page.

`.github/copilot-instructions.md:650` requires *"Set `Content-Security-Policy` headers"*. Not done.

**Note:** a CSP would need to allow `fonts.googleapis.com` / `fonts.gstatic.com` (`globals.css:1`) and `blob:`/`data:` for canvas and Babylon.

### SEC-17 — Everything is cleartext HTTP

Every URL in every configuration is `http://` — `.env.example:5,9,12,17,22,29,31`; `apps/api/.env:2,3,4,7,12,14`; `docker-compose.yml:80-88,107`. There is no TLS termination, no HSTS, no certificate pinning, and no `secure` cookie flag (no cookies are used at all).

Acceptable for `localhost` development; **there is no production configuration**, so there is nothing that would enable TLS.

### SEC-18 — Tokens in `localStorage`, no expiry, no logout, no revocation

`login/page.tsx:27-29` and `register/page.tsx:40-42` write `auth_token`, `user_id`, and `user_email` to `localStorage` — readable by any script on the origin, so any XSS is an immediate full account takeover.

The token payload contains `iat` but **no `exp`** (`auth.service.ts:112-114`), and nothing checks either. There is **no logout affordance anywhere in the UI**, no refresh mechanism, no revocation list, and no multi-device session view. A token, once issued, is valid forever — for whatever code eventually chooses to honour it.

`.github/copilot-instructions.md:627-629` requires server-side validation and enforced expiry. Neither exists.

### SEC-19 — Floating-point arithmetic on money

`orders.service.ts:47-53` computes `subtotal`, `tax`, and `total` as IEEE-754 doubles, then writes them to `Decimal(10,2)` columns (`schema.prisma:215-218`). The tests accommodate the imprecision with `toBeCloseTo(…, 2)` (`orders.service.spec.ts:223`; `order-business-rules.spec.ts:56`).

This directly violates the project's own rule: *"Never use floating point for money calculations"* (`.github/copilot-instructions.md:728`). Classified as a security finding because rounding drift in financial records is an integrity issue, not merely a correctness one.

### SEC-20 — Third-party font CDN on every page load

`apps/web/src/app/globals.css:1` imports from `fonts.googleapis.com`, which then fetches from `fonts.gstatic.com`. Every visitor's IP and User-Agent are disclosed to a third party on first paint, with no consent gate. This is a documented GDPR concern in EU jurisdictions.

**Remediation.** Self-host with `next/font/google`, which also removes the render-blocking request.

---

## 🟢 Low / informational

### SEC-21 — No dependency-vulnerability process
No `npm audit` in any script, no Dependabot/Renovate config, no `.github/dependabot.yml`, no SBOM, no lockfile-integrity CI step. 1,648 locked packages with no monitoring.

### SEC-22 — `minio/minio:latest` is unpinned
`docker-compose.yml:36`. The only unpinned image in the stack; supply-chain drift.

### SEC-23 — Compiled Python bytecode committed
`.github/prompts/ui-ux-pro-max/scripts/__pycache__/*.pyc` — 5 files, 164,741 bytes, for CPython 3.11 **and** 3.14. Binary artifacts in a source tree are an anti-pattern; `.pyc` files are also an execution vector if a stale one shadows a modified `.py`.

### SEC-24 — 3D assets served without integrity or caching policy
`/3d/studio-bg.jpg`, `/3d/studio.env`, `/3d/wood-table.jpg` (5.3 MB total) are fetched by Babylon (`product-3d.ts:457,465,508`), not by Next's image pipeline. No SRI, no explicit cache headers.

### SEC-25 — `console.error` in production frontend code
`editor-toolbar.tsx:60`. Contradicts `.github/copilot-instructions.md:298` ("No `console.log` in production code"). Low impact — no credential is logged.

### SEC-26 — Swagger UI served unconditionally
`main.ts:39` mounts `/api/docs` with no environment gate, publishing the full route map in any deployment.

### SEC-27 — Injection surfaces reviewed — clean

| Surface | Status |
|---------|--------|
| **SQL injection** | ✅ **None found.** All database access is via Prisma's query builder. There is **no** `$queryRaw`, `$executeRaw`, `$queryRawUnsafe`, or string-concatenated SQL anywhere in `apps/api/src`. The one raw SQL file is the generated migration |
| **XSS via `dangerouslySetInnerHTML`** | ✅ **Zero occurrences** in the entire frontend |
| **XSS via `eval` / `new Function`** | ✅ Zero occurrences |
| **XSS via `document.write`** | ⚠️ **One occurrence** — `editor-toolbar.tsx:95` writes an HTML string into a new window. The only interpolated value is `dataUrl`, produced locally by `canvas.toDataURL()` (a `data:image/png;base64,…` string), so it is not attacker-controlled in the current design. It is still a pattern worth removing |
| **Command injection** | ✅ No `child_process`, `exec`, or `spawn` in first-party code |
| **Path traversal (filesystem)** | ✅ No `fs` read/write with user input in the API |
| **Insecure deserialization** | ⚠️ `JSON.parse` on `localStorage` content at `editor-canvas.tsx:175,327` and `editor-store.ts:159,183`. Only `:175` is guarded by a try/catch. A malformed `design-*` value throws an unhandled error inside a promise chain. Self-inflicted only |
| **Prototype pollution** | ✅ No deep-merge utility and no `Object.assign` on untrusted input in application code |
| **SSRF** | ✅ No server-side fetch of a user-supplied URL |
| **Open redirect** | ✅ All `router.push` targets are string literals |

### SEC-28 — Mobile/native security controls: **Not present and not applicable**
No WebView, no JS bridge, no root/jailbreak detection, no emulator detection, no code obfuscation, no anti-tampering, no certificate pinning, no deep-link/intent-filter validation. This is a browser application with no native surface.

---

## Data protection and compliance

| Concern | Status |
|---------|--------|
| **PII collected** | Email, name (`users` table, `schema.prisma:31-32`); shipping and billing addresses as JSON (`orders`, `:221-222`); payment-card data captured in React state at `checkout/page.tsx:29-34` |
| **Card data handling** | ⚠️ Collected into memory and **never transmitted or stored** (`checkout/page.tsx:373-386`). Accidentally the safest outcome, but the UI asserts *"Your payment info is encrypted and secure"* (`:307`), which is **a false statement to the user** and a potential consumer-protection issue |
| **PCI-DSS** | Not applicable today (no card data leaves the browser), but the form's existence in a shipped build creates exposure. There is no Stripe Elements or equivalent — a real integration would need one |
| **Data at rest — passwords** | ✅ scrypt with a 16-byte random salt, 64-byte derived key, `timingSafeEqual` comparison (`auth.service.ts:27-46`). Competent |
| **Data at rest — everything else** | ❌ No column encryption. Addresses, emails, and design content are plaintext in Postgres. No `pgcrypto`, no TDE configuration |
| **Data at rest — client** | ❌ `localStorage` is plaintext: cart with full design JSON and base64 thumbnails, saved designs, auth token, user id, user email |
| **Data in transit** | ❌ HTTP only in every configuration |
| **Right to erasure (GDPR Art. 17)** | ❌ No user-deletion endpoint. `DELETE /designs/:id` exists; there is no `DELETE /users/:id`, no cascade, and no export |
| **Data portability (Art. 20)** | ❌ No export endpoint |
| **Consent / cookie banner** | ❌ None. No cookies are set, but the Google Fonts request happens before any consent |
| **Retention policy** | ❌ None defined. `Order` has no retention rule; `Design` has none; `Asset` has none |
| **Analytics / telemetry** | ✅ **None present** — see [18](./18-performance-findings.md#analytics-and-telemetry-phase-217). Zero third-party trackers is a genuine privacy positive |
| **COPPA** | ⚠️ The product is explicitly targeted at "Gen Alpha" (`package.json:5`, `README.md:3`) — a cohort born from ~2010, meaning a substantial portion are **under 13**. There is **no age gate, no parental-consent flow, and no age field** anywhere in the schema or UI. If this ships to a US audience as positioned, COPPA obligations are triggered and entirely unmet |

---

## Prioritised remediation order

Ordered by (impact × exploitability) ÷ effort.

| # | Action | Fixes | Effort |
|---|--------|-------|--------|
| 1 | Implement `verifyToken` + a global `AuthGuard`; derive `userId` from the token; delete every `x-user-id` parameter | SEC-01, SEC-02, SEC-11 | M |
| 2 | Look up prices server-side in `OrdersService.createOrder` | SEC-03 | S |
| 3 | Add an ownership check to `AssetsService.delete` | SEC-04 | S |
| 4 | Remove the `"dev-secret-key"` fallback; assert required env vars at boot | SEC-05 | S |
| 5 | Create `class-validator` DTOs for all 8 request bodies | SEC-06, SEC-08 (partly), SEC-03 (defence in depth) | M |
| 6 | Register `express-rate-limit`; switch `scryptSync` → async `scrypt` | SEC-07 | S |
| 7 | Add a global exception filter | SEC-09 | S |
| 8 | Add `tenantId` to `Design`; scope the three unscoped endpoints; add a visibility filter to `findDesignTemplateById` | SEC-15 | M |
| 9 | Cap `limit` at 100; paginate the four unbounded list endpoints | SEC-08 | S |
| 10 | Add structured logging with correlation ids and auth-event records | SEC-10 | M |
| 11 | Sanitise `filename`; add a server-side MIME allow-list and size cap | SEC-12, SEC-13 | S |
| 12 | Add `headers()` to `next.config.js` with a CSP | SEC-16 | M |
| 13 | Add `exp` to the token; implement logout; consider HTTP-only cookies (already recommended at `QA_AUDIT_REPORT.md:131`) | SEC-18 | M |
| 14 | Switch money maths to integer cents or `Prisma.Decimal` | SEC-19 | M |
| 15 | Self-host fonts via `next/font/google` | SEC-20 | S |
| 16 | Generic registration response | SEC-14 | S |
| 17 | Gate Swagger behind `NODE_ENV !== "production"` | SEC-26 | S |
| 18 | **Resolve the COPPA question before any public launch** | Compliance | — |
