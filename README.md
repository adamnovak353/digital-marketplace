# Digital Marketplace

Demo multi-vendor marketplace for digital goods. Listings are sample data. Payments, payouts, telecom provisioning, and card issuing use mock adapters. No brand has authorized resale of the named services.

## What runs locally

The customer, seller, and admin interfaces live in one Next.js app so they share a session:

- `apps/web` — marketplace, `/seller/*` portal, `/admin/*` dashboard, and `/api/v1`
- `apps/api` — NestJS process with the same handlers and Swagger at `/docs`
- `apps/worker` — BullMQ consumer. It stays idle until `REDIS_URL` is set, and it does not reveal inventory
- `packages/domain` — pricing, encrypted inventory, ledger, and order workflow
- `packages/ui` — neon layout and pages
- `prisma/schema.prisma` — PostgreSQL model for a later persistence switch

The demo process keeps state in memory. Restarting the server restores the seed.

## Setup

```bash
pnpm install
copy .env.example .env
pnpm dev
```

Open http://localhost:3000.

| Account | Email | Password | Next step |
| --- | --- | --- | --- |
| Customer | john@example.com | DemoPass123! | Account wallet starts with a $12.50 sample refund credit |
| Seller | seller@premiumstore.demo | DemoPass123! | Demo MFA code is shown on screen |
| Admin | admin@demo.marketplace | DemoPass123! | Demo MFA code is shown on screen |

Optional services:

```bash
pnpm dev:api      # http://localhost:4000/docs
pnpm dev:worker   # idle without Redis
docker compose up postgres redis
```

`PERSISTENCE=memory` is the working runtime. Setting `PERSISTENCE=prisma` does not switch the demo service onto Postgres yet. The schema and `prisma/migrations` are the database contract for that step.

## Checks

```bash
pnpm --filter @marketplace/domain test
pnpm --filter @marketplace/web build
```

## Money and delivery

- Prices are stored in integer cents and recalculated on the server.
- Card checkout creates a pending payment. The result page records a mock webhook. Nothing is charged.
- Wallet checkout spends refund credit only. There is no top-up or withdrawal.
- Phone numbers and virtual cards stay hidden until `FEATURE_TELECOM` or `FEATURE_CARDS` is set to `true`. Those flags still use mock adapters.
- Checkout accepts mock card, PayPal, or refund credit. Crypto methods are not offered.
- Instant products deliver an encrypted demo voucher to the order owner.
- Revealed units are quarantined on refund and are not listed again.
- Card numbers and CVV are rejected if someone tries to store them as inventory.

## Providers

Payment, payout, telecom, and card issuing adapters are mock. Do not add invented live credentials. A licensed issuer would host card data. This database does not store PAN or CVV.
