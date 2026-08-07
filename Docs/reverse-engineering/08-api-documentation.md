# 08 — API Documentation

[← Index](./00-index.md)

## 8.1 Global configuration

| Setting | Value | Source |
|---------|-------|--------|
| Global route prefix | `/api/v1` | `apps/api/src/main.ts:29` |
| Listen port | `process.env.PORT` or `4000` | `apps/api/src/main.ts:41-42` |
| OpenAPI UI | `/api/docs` (no version prefix — `setGlobalPrefix` runs before `SwaggerModule.setup`) | `apps/api/src/main.ts:39` |
| OpenAPI title/desc/version | "MyLovelyGift API" / "Product customization & e-commerce API" / "1.0" | `apps/api/src/main.ts:33-35` |
| Declared auth scheme | `addBearerAuth()` — **documentation only; nothing enforces it** | `apps/api/src/main.ts:36` |
| CORS | `origin: process.env.FRONTEND_URL ?? "http://localhost:3000"`, `credentials: true` | `apps/api/src/main.ts:14-17` |
| Security headers | `helmet()` with **default options** — no CSP customisation, no HSTS tuning | `apps/api/src/main.ts:12` |
| Compression | `compression()` with default options | `apps/api/src/main.ts:13` |
| Validation | `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` | `apps/api/src/main.ts:20-26` |
| Rate limiting | **None.** `express-rate-limit` is installed but never imported | `apps/api/src/main.ts:1-47` |
| Global exception filter | **None** | `apps/api/src/main.ts:1-47` |
| Global interceptors | **None** | — |
| Global guards | **None** | — |
| Request logging | **None** — the only output is two `console.log` startup banners | `apps/api/src/main.ts:43-44` |
| Health endpoint | **Not present** | — |

### Why `ValidationPipe` currently does nothing

`whitelist` and `forbidNonWhitelisted` operate on **class metadata emitted by `class-validator` decorators**. Every request body in this API is typed with an **inline TypeScript interface**, e.g. `@Body() body: { email: string; password: string }` (`apps/api/src/modules/auth/auth.controller.ts:18`). Interfaces are erased at compile time, so the pipe receives no metadata and validates nothing. **Every endpoint accepts arbitrary JSON.** This is the mechanism behind the price-tampering issue in [16](./16-security-findings.md).

---

## 8.2 Endpoint reference

Base URL for all rows: `{NEXT_PUBLIC_API_URL}` = `http://localhost:4000/api/v1` (`apps/web/.env.local:1`).

**Auth column legend:** *None* means literally no check — no guard, no token verification, no session.

### Auth — `apps/api/src/modules/auth/auth.controller.ts`

#### `POST /api/v1/auth/login`

| | |
|---|---|
| Handler | `AuthController.login` — `auth.controller.ts:15-36` |
| Purpose | Exchange email + password for a token |
| Headers | `x-tenant-id` (optional; falls back to `"default"` — `auth.controller.ts:24`) |
| Request body | `{ email: string; password: string }` — `auth.controller.ts:18` (unvalidated) |
| Success 200/201 | `{ token: string, user: { id, email, name, role } }` — `auth.controller.ts:27-35`. **`passwordHash`, `tenantId`, `medusaId`, and timestamps are deliberately excluded** (asserted by `apps/api/tests/unit/modules/auth/auth.controller.spec.ts:110`) |
| Errors | `400 BadRequestException "Invalid tenant"` (`auth.service.ts:22`); `401 UnauthorizedException "Invalid email or password"` (`auth.service.ts:105`) — same message for unknown user and wrong password, so no user enumeration via message |
| Timeout / retry | None configured on either side |
| Rate limit | **None** — unlimited credential-stuffing surface |
| Calling site | `apps/web/src/app/(auth)/auth/login/page.tsx:25` |

#### `POST /api/v1/auth/register`

| | |
|---|---|
| Handler | `AuthController.register` — `auth.controller.ts:38-60` |
| Headers | `x-tenant-id` (optional, defaults `"default"` — `auth.controller.ts:48`) |
| Request body | `{ email: string; name?: string; password: string }` — `auth.controller.ts:41` |
| Business rules | Password ≥ 8 characters (`auth.service.ts:90-92`); email must be unique within the tenant (`auth.service.ts:83-88`); role is forced to `CUSTOMER` (`auth.service.ts:94-99` never passes `role`, and `createUser` defaults it at `auth.service.ts:67`) |
| Success | `{ token, user: { id, email, name, role } }` |
| Errors | `400 "Invalid tenant"`; `409 ConflictException "An account with this email already exists"` (`auth.service.ts:87`) — **this is a user-enumeration oracle**; `400 "Password must be at least 8 characters"` |
| Note | The password-length check runs **after** the duplicate-email check, so a short password on an existing email returns 409, not 400 |
| Calling site | `apps/web/src/app/(auth)/auth/register/page.tsx:38` |

#### `POST /api/v1/auth/forgot-password` — **DOES NOT EXIST**

The frontend calls it at `apps/web/src/app/(auth)/auth/forgot-password/page.tsx:21`. `AuthController` declares only `login` and `register`. The request 404s, the `catch` block at `forgot-password/page.tsx:24-28` swallows the error, and the UI shows *"If an account exists, a reset link was sent."* — a success message for a request that always fails. No email is ever sent.

---

### Products — `apps/api/src/modules/products/products.controller.ts`

#### `GET /api/v1/products`

| | |
|---|---|
| Handler | `ProductsController.findAll` — `products.controller.ts:20-39` |
| Headers | `x-tenant-id` (**required in effect** — passed straight into the `where` clause with no null check, `products.service.ts:17`) |
| Query | `category?` (category **slug**), `search?`, `limit?`, `offset?` — all strings; `limit`/`offset` parsed with `parseInt(_, 10)` (`products.controller.ts:36-37`) |
| Response | `{ products: Product[], total: number }` — `products.service.ts:47`. **Note this does not match the `{ data, total, limit, offset }` envelope prescribed by `.github/copilot-instructions.md:582-589`** |
| Includes | `category`, `variants`, `images` ordered by `position asc` — `products.service.ts:35-39` |
| Implicit filter | `status: "ACTIVE"` is always applied — `products.service.ts:18` |
| Search behaviour | Case-insensitive `contains` across `name` OR `description` — `products.service.ts:26-29` |
| Pagination | `take: limit ?? 20`, `skip: offset ?? 0`, `orderBy: createdAt desc` — `products.service.ts:40-42`. **No maximum `limit` is enforced**, contradicting `.github/copilot-instructions.md:603` ("Maximum limit: 100"). `?limit=1000000` is accepted. |
| Errors | No explicit error handling. `parseInt("abc")` yields `NaN`, which Prisma will reject with a 500. |
| Calling site | **None.** `productsApi.list` (`apps/web/src/lib/api.ts:28-29`) is imported by zero files. |

#### `GET /api/v1/products/:id`

| | |
|---|---|
| Handler | `ProductsController.findOne` — `products.controller.ts:41-45` |
| Headers | **No `x-tenant-id`.** This endpoint is **not tenant-scoped** — `products.service.ts:50-62` looks up by primary key only. Any tenant's product is readable by ID. |
| Response | Product with `category`, `variants`, `images`, `designTemplates.template`, or **`null`** if not found — returned as HTTP 200 with a `null` body, not a 404 |
| Calling site | **None** |

#### `GET /api/v1/products/slug/:slug`

| | |
|---|---|
| Handler | `ProductsController.findBySlug` — `products.controller.ts:47-54` |
| Headers | `x-tenant-id` required (compound unique key `slug_tenantId`, `products.service.ts:66`) |
| Response | Same shape as `/products/:id`, or `null` |
| **Route-ordering note** | `@Get(":id")` is declared at `products.controller.ts:41` **before** `@Get("slug/:slug")` at line 47. Nest matches in declaration order, so `GET /products/slug/foo` would first try `:id = "slug"`… except Nest's path-to-regexp treats `slug/:slug` as a two-segment path and `:id` as one segment, so they do not actually collide. Verified safe, but the ordering is fragile if a wildcard is ever added. |
| Calling site | **None** |

#### Service methods with no HTTP route

`ProductsService.create` (`products.service.ts:78-83`), `.update` (`85-91`), and `.delete` (`93-95`) exist and are unit-tested (`apps/api/tests/unit/modules/products/products.service.spec.ts:222-277`) but **no controller exposes them**. There is no way to create a product through the API. Products can only enter the system via `apps/api/prisma/seed.ts`.

---

### Templates — `apps/api/src/modules/templates/templates.controller.ts`

#### `GET /api/v1/templates/categories`

| | |
|---|---|
| Handler | `templates.controller.ts:10-14` |
| Headers | `x-tenant-id` (required in effect) |
| Response | `CategoryTemplate[]` ordered by `name asc` — `templates.service.ts:9-12`. **Unpaginated and unbounded.** |
| Calling site | **None** |

#### `GET /api/v1/templates/categories/:slug`

| | |
|---|---|
| Handler | `templates.controller.ts:16-23` |
| Headers | `x-tenant-id` |
| Response | Category + nested `designTemplates` filtered to `visibility: "PUBLIC"`, ordered `createdAt desc` — `templates.service.ts:16-24`. **The nested list is unpaginated.** |
| Errors | Returns `null` (HTTP 200) when the slug is unknown |
| Calling site | **None** |

#### `GET /api/v1/templates/designs/:categoryId`

| | |
|---|---|
| Handler | `templates.controller.ts:25-38` |
| Headers | **None** — not tenant-scoped |
| Query | `tags?` (comma-separated, split at `templates.controller.ts:34`), `limit?`, `offset?` |
| Filter | `categoryId` + `visibility: "PUBLIC"` + optional `tags: { hasSome }` — `templates.service.ts:33-39`. The tag filter is only applied when `params.tags.length` is truthy (`templates.service.ts:36`) |
| Pagination | `take: limit ?? 20`, `skip: offset ?? 0` |
| Calling site | **None** |

#### `GET /api/v1/templates/design/:id`

| | |
|---|---|
| Handler | `templates.controller.ts:40-44` |
| Headers | **None** — not tenant-scoped. A `PRIVATE` or `MERCHANT` template is fully readable by ID because `findDesignTemplateById` applies **no visibility filter** (`templates.service.ts:46-51`) |
| Response | Template + `category`, or `null` |
| Calling site | **None** |

#### Service method with no HTTP route

`TemplatesService.createDesignTemplate` (`templates.service.ts:53-71`) is implemented and tested (`apps/api/tests/unit/modules/templates/templates.service.spec.ts:185-256`) but unreachable.

---

### Designs — `apps/api/src/modules/designs/designs.controller.ts`

Every route in this module derives identity from the `x-user-id` header.

| Method | Path | Handler | Headers | Body | Response | Errors |
|--------|------|---------|---------|------|----------|--------|
| GET | `/designs` | `designs.controller.ts:19-23` | `x-user-id` | — | `Design[]` ordered `updatedAt desc` (`designs.service.ts:9-12`). **Unpaginated.** If the header is absent, `userId` is `undefined` and Prisma returns `[]` | none |
| GET | `/designs/:id` | `designs.controller.ts:25-32` | `x-user-id` | — | `Design` | `404 NotFoundException "Design not found"` when missing **or owned by another user** (`designs.service.ts:19-21`) — correctly avoids leaking existence |
| POST | `/designs` | `designs.controller.ts:34-41` | `x-user-id` | `{ name: string; productId?: string; canvasData: any }` | Created `Design` | Prisma FK error (500) if `userId` does not exist. **`canvasData` is `any` and unbounded — no size limit, no schema check** |
| PUT | `/designs/:id` | `designs.controller.ts:43-51` | `x-user-id` | `{ name?, canvasData?, thumbnailUrl? }` | Updated `Design` | `404` on missing/foreign |
| PUT | `/designs/:id/finalize` | `designs.controller.ts:53-60` | `x-user-id` | — | `Design` with `status: "FINALIZED"` (`designs.service.ts:42-48`) | `404` on missing/foreign. **No state-machine guard — an already-`ORDERED` design can be re-finalised** |
| DELETE | `/designs/:id` | `designs.controller.ts:62-69` | `x-user-id` | — | Deleted `Design` | `404` on missing/foreign. **Hard delete** — `designs.service.ts:52`. Will throw a Prisma FK violation (500) if the design is referenced by an `order_items` row, because that FK is `onDelete: Restrict` (`migration.sql:283`) |

**Calling sites: none.** `designsApi` (`apps/web/src/lib/api.ts:44-53`) is imported nowhere. The frontend's "My Designs" page reads `localStorage` instead (`apps/web/src/app/(shop)/my-designs/page.tsx:23-39`).

---

### Orders — `apps/api/src/modules/orders/orders.controller.ts`

| Method | Path | Handler | Headers | Body | Response |
|--------|------|---------|---------|------|----------|
| GET | `/orders` | `orders.controller.ts:10-14` | `x-user-id` | — | `Order[]` with `items`, ordered `createdAt desc` (`orders.service.ts:13-17`). **Unpaginated.** |
| GET | `/orders/:id` | `orders.controller.ts:16-23` | `x-user-id` | — | `Order` with `items.design`. `404 "Order not found"` when missing or foreign (`orders.service.ts:29-31`) |
| POST | `/orders` | `orders.controller.ts:25-47` | `x-user-id`, `x-tenant-id` | `{ items: Array<{ designId, quantity, unitPrice, options? }>, shippingAddress?, billingAddress? }` | Created `Order` with `items` |

#### `POST /orders` pricing rules — the only real business logic in the backend

Implemented at `apps/api/src/modules/orders/orders.service.ts:47-53`:

```
subtotal     = Σ (item.unitPrice × item.quantity)
tax          = subtotal × 0.10
shippingCost = subtotal > 50 ? 0 : 5.99
total        = subtotal + tax + shippingCost
```

| Rule | Value | Boundary behaviour | Test |
|------|-------|-------------------|------|
| Tax rate | 10 %, hardcoded, no jurisdiction logic | `orders.service.ts:51` | `orders.service.spec.ts:139-154` |
| Free-shipping threshold | `subtotal > 50` — **strictly greater** | Exactly $50.00 pays $5.99; $50.01 is free | `orders.service.spec.ts:190-206` (asserts $50 pays) and `order-business-rules.spec.ts:86-105` (asserts $50.01 is free) |
| Flat shipping | $5.99 | Charged even on an **empty** order (`subtotal = 0` → `total = 5.99`) | `orders.service.spec.ts:286-303` explicitly asserts this |
| Currency | Column default `"USD"`, never set explicitly | `schema.prisma:219` | — |
| Status | Always created as `PENDING` (column default) | `schema.prisma:214` | — |
| `medusaOrderId` | Never written | `schema.prisma:220` | — |
| `paymentMethod` | Never written | `schema.prisma:223` | — |

**Three defects in this handler:**

1. **`unitPrice` comes from the client.** `orders.controller.ts:33` accepts it in the body and `orders.service.ts:48` multiplies it. Nothing cross-references `products.basePrice` or `product_variants.price`. An attacker orders anything for `unitPrice: 0.01`.
2. **Floating-point money.** `subtotal`, `tax`, and `total` are computed as JS numbers, then written to `Decimal(10,2)` columns (`schema.prisma:215-218`). This directly violates the project's own rule at `.github/copilot-instructions.md:728` ("Never use floating point for money calculations"). The tests accommodate it with `toBeCloseTo(…, 2)` (`orders.service.spec.ts:223`, `order-business-rules.spec.ts:56`).
3. **`designId` is never validated.** No check that the design exists, that it belongs to the ordering user, or that its status is `FINALIZED` — even though `.github/copilot-instructions.md:691` states "Only `FINALIZED` designs can be added to orders." The FK will reject a non-existent design with a 500, but a *different user's* design ID is accepted.

**`OrdersService.updateStatus`** (`orders.service.ts:80-85`) exists, is tested (`orders.service.spec.ts:306-340`), and casts the status with `as any` (`orders.service.ts:83`) — no state-machine validation. **It has no HTTP route**, so order status can never change through the API.

**Calling sites: none.** `ordersApi.create` (`apps/web/src/lib/api.ts:59-63`) is never invoked; checkout simulates instead (`apps/web/src/app/(shop)/checkout/page.tsx:377`).

---

### Assets — `apps/api/src/modules/assets/assets.controller.ts`

| Method | Path | Handler | Headers | Body | Response |
|--------|------|---------|---------|------|----------|
| POST | `/assets/upload-url` | `assets.controller.ts:10-17` | `x-tenant-id` | `{ filename: string; mimeType: string }` | `{ uploadUrl, key, publicUrl }` |
| POST | `/assets/confirm` | `assets.controller.ts:19-38` | `x-user-id`, `x-tenant-id` | `{ filename, mimeType, size, s3Key, type? }` | Created `Asset` row |
| DELETE | `/assets/:id` | `assets.controller.ts:40-44` | **none** | — | Deleted `Asset`, or `undefined` if not found |

**Key construction:** `${tenantId ?? "global"}/${uuid()}/${filename}` — `assets.service.ts:35`. The raw client-supplied `filename` is concatenated without sanitisation, so `../` sequences and unicode names land verbatim in the S3 key. `assets.service.spec.ts:69-83` explicitly asserts that `"my file (1).png"` and `"日本語.png"` pass through unchanged.

**Presigned URL:** `PutObjectCommand` with `ContentType` from the request, `expiresIn: 3600` seconds (`assets.service.ts:37-45`).

**Unenforced constraints:**
- No `Content-Length` / size limit on the presigned `PUT`. `validationRules.maxFileSize` exists in the seed data (`apps/api/prisma/seed.ts:38,59,80,101`) but is **never read by any code**.
- No MIME allow-list on the server. The client-side filter is `file.type.startsWith("image/")` plus a 10 MB cap (`apps/web/src/components/editor/editor-left-panel.tsx:174-175`) — trivially bypassed by calling the API directly.
- `POST /assets/confirm` accepts an arbitrary `s3Key` and `size`. A caller can register a DB row pointing at any object in the bucket, including another tenant's.
- `DELETE /assets/:id` has **no ownership check at all** (`assets.service.ts:75-87`) — any ID can be deleted by anyone.

**Calling sites: none.** `assetsApi` (`apps/web/src/lib/api.ts:67-73`) is never used. Image uploads in the editor stay entirely client-side as base64 data URLs (`apps/web/src/components/editor/editor-left-panel.tsx:177-183`).

---

## 8.3 HTTP client configuration (frontend)

`apps/web/src/lib/api.ts`

| Aspect | Value | Line |
|--------|-------|------|
| Instance | `axios.create({ baseURL, headers })` | `api.ts:6-12` |
| `baseURL` | `process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1"` | `api.ts:3` |
| Static headers | `Content-Type: application/json`, `x-tenant-id: NEXT_PUBLIC_TENANT_ID ?? "default"` | `api.ts:9-11` |
| Request interceptor | Reads `localStorage.auth_token`; if present sets `Authorization: Bearer <token>` **and** `x-user-id: localStorage.user_id ?? ""` | `api.ts:15-24` |
| Response interceptor | **None** — no 401 handling, no token refresh, no global error toast | — |
| Timeout | **Not configured** — axios default is 0 (infinite) | — |
| Retry policy | **None** | — |
| Cancellation | **None** — no `AbortController` anywhere | — |
| SSR guard | `typeof window !== "undefined"` before touching `localStorage` | `api.ts:16` |

### Declared API namespaces and their usage

| Export | Methods | Imported by |
|--------|---------|-------------|
| `api` (raw axios) | — | `login/page.tsx:9`, `register/page.tsx:9`, `forgot-password/page.tsx:8` |
| `productsApi` | `list`, `getById`, `getBySlug` (`api.ts:27-32`) | **nothing** |
| `templatesApi` | `getCategories`, `getCategoryBySlug`, `getDesignTemplates`, `getDesignTemplate` (`api.ts:35-41`) | **nothing** |
| `designsApi` | `list`, `getById`, `create`, `update`, `finalize`, `delete` (`api.ts:44-53`) | **nothing** |
| `ordersApi` | `list`, `getById`, `create` (`api.ts:56-64`) | **nothing** |
| `assetsApi` | `getUploadUrl`, `confirmUpload`, `delete` (`api.ts:67-73`) | **nothing** |

`apps/web/tests/unit/lib/api.spec.ts` asserts only that these functions are `toBeDefined()` (lines 77-163) — it never calls one or checks a URL, so it would pass even if every path were wrong.

---

## 8.4 Protocols and capabilities

| Capability | Status | Evidence |
|-----------|--------|----------|
| REST | ✅ The only protocol | `apps/api/src/modules/**/*.controller.ts` |
| GraphQL | **Not present** | No `@nestjs/graphql`, no `.graphql`, no schema |
| WebSockets | **Not present** | No `@nestjs/websockets`, no gateway. `README.md:143` says "Real-time ready: Architecture supports WebSocket collaboration (Phase 3)" — aspirational only |
| Server-Sent Events | **Not present** | |
| gRPC / MQTT | **Not present** | |
| Polling | **Not present** | |
| Webhooks (in or out) | **Not present** | |
| Serialisation | JSON only, via Express body parser and `res.json` | |
| Pagination strategy | `limit`/`offset` on 2 of 14 endpoints; unbounded on the rest | `products.service.ts:40-41`, `templates.service.ts:40-41` |
| Rate limiting / backoff | **Not present** on the server. `MedusaService` sets `maxRetries: 3` on its client (`medusa.service.ts:12`) — the only retry configuration in the codebase, and it is on a path no request reaches | |
| Offline queuing | **Not present** | |
| Certificate pinning | **Not present** — no TLS at all in local config; all URLs are `http://` | `.env.example:5,9,12,17,22,29,31` |
| Idempotency keys | **Not present** — `POST /orders` is fully re-executable | |
| API versioning | Path-prefix only (`/api/v1`); no header or content negotiation | `main.ts:29` |
| ETag / conditional requests | **Not present** | |
| Correlation / request IDs | **Not present** | |

---

## 8.5 Endpoint × caller matrix

| Endpoint | Exists in API | Has a frontend client fn | Actually called | Covered by a unit test |
|----------|:-------------:|:-----------------------:|:---------------:|:----------------------:|
| `POST /auth/login` | ✅ | ✅ (raw `api.post`) | ✅ | ✅ `auth.controller.spec.ts:30-124` |
| `POST /auth/register` | ✅ | ✅ (raw `api.post`) | ✅ | ✅ `auth.controller.spec.ts:127-197` |
| `POST /auth/forgot-password` | ❌ | ✅ (raw `api.post`) | ✅ → **404** | ❌ |
| `GET /products` | ✅ | ✅ | ❌ | ✅ `products.controller.spec.ts:32-82` |
| `GET /products/:id` | ✅ | ✅ | ❌ | ✅ `products.controller.spec.ts:84-97` |
| `GET /products/slug/:slug` | ✅ | ✅ | ❌ | ✅ `products.controller.spec.ts:99-113` |
| `POST/PUT/DELETE /products` | ❌ (service only) | ❌ | ❌ | ✅ service-level only |
| `GET /templates/categories` | ✅ | ✅ | ❌ | ✅ `templates.controller.spec.ts:31-44` |
| `GET /templates/categories/:slug` | ✅ | ✅ | ❌ | ✅ `templates.controller.spec.ts:46-59` |
| `GET /templates/designs/:categoryId` | ✅ | ✅ | ❌ | ✅ `templates.controller.spec.ts:61-108` |
| `GET /templates/design/:id` | ✅ | ✅ | ❌ | ✅ `templates.controller.spec.ts:110-123` |
| `POST /templates/designs` (create) | ❌ (service only) | ❌ | ❌ | ✅ service-level only |
| `GET /designs` | ✅ | ✅ | ❌ | ✅ `designs.controller.spec.ts:32-45` |
| `GET /designs/:id` | ✅ | ✅ | ❌ | ✅ `designs.controller.spec.ts:47-60` |
| `POST /designs` | ✅ | ✅ | ❌ | ✅ `designs.controller.spec.ts:62-96` |
| `PUT /designs/:id` | ✅ | ✅ | ❌ | ✅ `designs.controller.spec.ts:98-112` |
| `PUT /designs/:id/finalize` | ✅ | ✅ | ❌ | ✅ `designs.controller.spec.ts:114-127` |
| `DELETE /designs/:id` | ✅ | ✅ | ❌ | ✅ `designs.controller.spec.ts:129-141` |
| `GET /orders` | ✅ | ✅ | ❌ | ✅ `orders.controller.spec.ts:30-43` |
| `GET /orders/:id` | ✅ | ✅ | ❌ | ✅ `orders.controller.spec.ts:45-58` |
| `POST /orders` | ✅ | ✅ | ❌ | ✅ `orders.controller.spec.ts:60-96` + `order-business-rules.spec.ts` |
| `PATCH /orders/:id/status` | ❌ (service only) | ❌ | ❌ | ✅ service-level only |
| `POST /assets/upload-url` | ✅ | ✅ | ❌ | ✅ `assets.controller.spec.ts:29-53` |
| `POST /assets/confirm` | ✅ | ✅ | ❌ | ✅ `assets.controller.spec.ts:55-79` |
| `DELETE /assets/:id` | ✅ | ✅ | ❌ | ✅ `assets.controller.spec.ts:81-95` |
| `GET /health` | ❌ | ❌ | ❌ | ❌ |

**Totals: 20 endpoints implemented, 2 ever called, 1 called but nonexistent.**

---

## 8.6 Base URLs per environment

| Environment | Frontend → API | API → DB | API → S3 | API → Medusa | Source |
|-------------|---------------|----------|----------|--------------|--------|
| Local (`.env.example`) | `http://localhost:4000/api/v1` | `postgres://…@localhost:**5432**/mylovelygift` ⚠ wrong port | `http://localhost:9000` | `http://localhost:9000` ⚠ same as S3 | `.env.example:5,17,22,29` |
| Local (actual `apps/api/.env`) | — | `postgres://…@localhost:**5433**/mylovelygift` ✅ | `http://localhost:9000` | `http://localhost:9000` ⚠ | `apps/api/.env:2,4,7` |
| Local (actual `apps/web/.env.local`) | `http://localhost:4000/api/v1` | — | — | — | `apps/web/.env.local:1` |
| Docker Compose | `http://localhost:4000/api/v1` | `postgres://…@postgres:5432/mylovelygift` | `http://minio:9000` | `http://medusa:9000` | `docker-compose.yml:80-88,107` |
| Staging / Production | **Not defined anywhere** | — | — | — | — |

No `.env.staging`, `.env.production`, or environment-specific config file exists. There is **no build-flavor, scheme, or variant system** of any kind.
