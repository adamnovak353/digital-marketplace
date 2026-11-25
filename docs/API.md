# API

Both `apps/web` (`/api/v1`) and `apps/api` call the same domain router.

Open `http://localhost:3000/docs/api` for the route list, or `http://localhost:4000/docs` when the Nest process is running.

Public webhook calls need `x-webhook-secret` (default `demo-webhook-secret` in demo mode). The checkout result button uses the authenticated demo-confirm route instead of a raw webhook.

Sensitive admin changes require `{ "confirm": true }`.

Inventory ciphertext is not returned by product, order, or admin list endpoints. Delivery plaintext is returned only to the order owner.
