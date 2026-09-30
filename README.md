# My Special Gift (MySpecialGift)

Design personalised mugs, tees, stickers and badges in a live 2D/3D editor, save them to your account, and place real orders (test payment by default).

This is a redesign of V1, not a clone. The reverse-engineering dossier that drove the rebuild lives in [`docs/reverse-engineering/`](docs/reverse-engineering/). Non-negotiable contracts are listed in [`docs/invariants.md`](docs/invariants.md).

## Stack

- **Next.js 15** (App Router) + React 19 — one full-stack app; domain logic in `src/server/`
- **PostgreSQL 16** via Docker (host port **5434**) + **Prisma 6** (migrations committed)
- **Fabric.js** (2D editor) + **Babylon.js** (3D preview)
- **Tailwind CSS 4**, Radix primitives, Vitest, Playwright

## Quick start

```bash
cp .env.example .env
npm install
npm run db:up          # starts Postgres on localhost:5434
npx prisma migrate deploy
npm run db:seed
npm run dev            # http://localhost:3000
```

If port 3000 is taken, Next will pick another port — set `PORT` when running E2E so Playwright matches:

```bash
$env:PORT=3001; npm run e2e   # PowerShell
```

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `start` | Production build |
| `npm run lint` / `typecheck` / `test` | Static checks + unit tests |
| `npm run e2e` | Playwright journeys (catalog, auth, checkout) |
| `npm run db:up` / `db:migrate` / `db:seed` | Database |

## App map

| Area | Routes |
| --- | --- |
| Catalog | `/`, `/products`, `/products/[slug]`, `/templates` |
| Studio | `/editor/new?product=…`, `/editor/[designId]` |
| Account | `/designs`, `/account` |
| Commerce | `/cart`, `/checkout`, `/orders`, `/orders/[id]` |
| Auth | `/login`, `/register` |

Checkout uses a clearly labelled **test payment provider**. Setting `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` without a Stripe adapter installed fails loudly — there is no silent fake.

## Security highlights (vs V1)

- Session cookie auth; DB stores SHA-256 of the token only
- Server-authoritative pricing (integer cents); cart never stores unit prices
- No client-supplied user id; ownership misses return the same 404 as absence
- Env validation fails fast — no fallback secrets

## License

Private — all rights reserved.
