# Deployment

1. Load `SESSION_SECRET`, `INVENTORY_ENC_KEY`, and provider credentials from a secrets manager. The values in `.env.example` are for local demo only.
2. Run PostgreSQL 16 and Redis 7. `docker compose up postgres redis` starts them locally.
3. Apply `prisma/migrations` with `pnpm db:migrate` once the API is pointed at `PERSISTENCE=prisma`. That switch is not active in this build; the live demo remains in memory.
4. Build the web app with `pnpm --filter @marketplace/web build` and serve it behind HTTPS.
5. Run `apps/api` and `apps/worker` as separate processes. Leave provider variables unset until a licensed processor, payout partner, telecom API, or card issuer is approved.
6. Do not log request bodies for inventory or delivery routes.

`docker compose up` builds web, API, and worker images. Those images still use the in-memory demo unless persistence is implemented.
