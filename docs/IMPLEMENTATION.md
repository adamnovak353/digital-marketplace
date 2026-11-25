# Implementation checklist

## Working in this repository

- [x] pnpm workspace with web, API, worker, UI, domain, validation, types, and API client
- [x] Neon marketplace, seller portal, and admin pages on real demo data
- [x] Admin inventory, payments, payouts, disputes, tickets, and accounts use the same panel and real actions
- [x] Guest cart, server-priced checkout, mock card or PayPal webhook, refund-credit wallet
- [x] Phone numbers and virtual cards hidden unless `FEATURE_TELECOM` or `FEATURE_CARDS` is true
- [x] Encrypted inventory, owner-only delivery, quarantine on refund
- [x] Double-entry ledger with pending, available, and payout-hold balances
- [x] Customer, seller, and admin roles, with MFA for seller and admin
- [x] Seller application, listing review, payout request, and dispute actions that require confirmation
- [x] Domain tests for pricing, races, webhook replay, retries, ownership, refunds, and payouts
- [x] Docker Compose, GitHub Actions, and environment example

## Explicitly not live

- [ ] Postgres is modeled in Prisma but the running service is in memory
- [ ] Redis worker acknowledges jobs and does not deliver secrets
- [ ] Email, Sentry, and OpenTelemetry stay off until their environment variables are set
- [ ] Payment and payout providers are mock adapters
- [ ] Telecom and virtual cards stay off. Turning the flags on still uses mock adapters
- [ ] Crypto checkout, wallet top-ups, and withdrawals are out of the MVP
- [ ] API responses are not yet wrapped in `{ data, meta, error }`, and checkout does not require an Idempotency-Key header
- [ ] No brand authorization is claimed for the sample catalog
