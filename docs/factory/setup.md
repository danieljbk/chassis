# Per-Project Setup

Go from "Use this template" to a running app. Every step connects one chassis layer; skip none.

---

## 1. Create the repo

On GitHub, open the chassis template and click **Use this template → Create a new repository**. Name it after the product.

```bash
git clone git@github.com:kwon/<product>.git
cd <product>
bun install
```

## 2. Convex

Convex is the backend, database, and function runtime. Each project needs its own deployment so data is isolated.

```bash
bunx convex dev --once
```

This creates a new Convex project and writes three values to `.env.local`:

```
CONVEX_DEPLOYMENT=dev:<slug>
NEXT_PUBLIC_CONVEX_URL=https://<slug>.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://<slug>.convex.site
```

If you already have a Convex project, update these manually. The `NEXT_PUBLIC_CONVEX_SITE_URL` is needed for Stripe webhooks later.

## 3. Clerk

Clerk handles authentication. The chassis is wired so every authed Convex function (`authedQuery`, `authedMutation`, `authedAction`) requires a valid Clerk session. Without this step, all authed functions throw.

1. **Create a Clerk application** (or open an existing one) at [dashboard.clerk.com](https://dashboard.clerk.com).

2. **Create a JWT template** — go to [JWT Templates](https://dashboard.clerk.com/last-active?path=jwt-templates) → **New template** → choose **Convex**. Do **not** rename it; it must be called `convex`.

3. **Copy the Issuer URL** from the JWT template (looks like `https://<app>.clerk.accounts.dev`).

4. **Set the issuer in Convex** — go to your Convex deployment's [Environment Variables](https://dashboard.convex.dev) and add:

   ```
   CLERK_JWT_ISSUER_DOMAIN = <issuer URL>
   ```

5. **Add Clerk keys to `.env.local`** — from the Clerk dashboard → **API Keys**, copy the publishable key and secret key:

   ```
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   ```

## 4. Stripe

Stripe handles billing. The chassis uses `@convex-dev/stripe`, which manages customer/subscription state in Convex and syncs via webhooks.

1. **Create a webhook** in the [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/webhooks) pointing at:

   ```
   https://<convex-slug>.convex.site/stripe/webhook
   ```

   Subscribe to these events:
   - `checkout.session.completed`
   - `customer.created`, `customer.updated`
   - `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`
   - `payment_intent.succeeded`, `payment_intent.payment_failed`

   You **must** include `invoice.finalized` or subscription tables will be empty after checkout.

2. **Set Stripe keys in Convex** — in your Convex deployment's Environment Variables, add:

   ```
   STRIPE_SECRET_KEY = sk_test_...
   STRIPE_WEBHOOK_SECRET = whsec_...
   ```

   The webhook secret is shown immediately after creating the webhook in Stripe.

## 5. Sentry

Sentry provides push-based error alerting. The chassis reads the DSN from an environment variable so no secrets are hardcoded.

1. **Create a Sentry project** (or reuse an existing one) at [sentry.io](https://sentry.io). Copy the DSN.

2. **Add to `.env.local`**:

   ```
   NEXT_PUBLIC_SENTRY_DSN=https://...@...ingest.us.sentry.io/...
   ```

The three Sentry config files (`sentry.server.config.ts`, `sentry.edge.config.ts`, `instrumentation-client.ts`) already read from `process.env.NEXT_PUBLIC_SENTRY_DSN`.

## 6. Cloudflare

Cloudflare Workers is the production runtime via OpenNext. Two things need updating per project.

1. **Rename the worker** — in `wrangler.jsonc`, change `"name"` and the `"service"` self-reference to match your product:

   ```jsonc
   {
     "name": "<product>",
     "services": [
       {
         "binding": "WORKER_SELF_REFERENCE",
         "service": "<product>",
       },
     ],
   }
   ```

2. **Set secrets** — Clerk's secret key is needed at the edge for SSR:

   ```bash
   bunx wrangler secret put CLERK_SECRET_KEY
   ```

3. **Set build-time vars** — add a `"vars"` block to `wrangler.jsonc` for any `NEXT_PUBLIC_*` values the app needs at build/runtime:

   ```jsonc
   {
     "vars": {
       "NEXT_PUBLIC_SENTRY_DSN": "https://...",
       "NEXT_PUBLIC_CONVEX_URL": "https://<slug>.convex.cloud",
     },
   }
   ```

## 7. Verify

Run through each layer to confirm the wiring is sound.

**Local dev:**

```bash
bun run dev
```

Visit `http://localhost:3000`. Confirm the app loads and you can sign in via Clerk.

**Workers preview:**

```bash
bun run preview:worker
```

Confirm the app loads under the Workers runtime.

**Production deploy:**

```bash
bun run deploy:worker
```

Visit the deployed URL. Confirm it loads end-to-end.

**Stripe:** Send a test webhook from the Stripe dashboard. Confirm the event reaches your Convex deployment (check Convex dashboard logs).

**Sentry:** Throw a test error. Confirm it appears in Sentry without you having to check manually (alert should fire).

---

## Quick reference: all environment variables

| Variable                            | Where to set                        | Source                         |
| ----------------------------------- | ----------------------------------- | ------------------------------ |
| `CONVEX_DEPLOYMENT`                 | `.env.local`                        | `bunx convex dev --once`       |
| `NEXT_PUBLIC_CONVEX_URL`            | `.env.local`, `wrangler.jsonc` vars | Convex dashboard               |
| `NEXT_PUBLIC_CONVEX_SITE_URL`       | `.env.local`                        | Convex dashboard               |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local`                        | Clerk → API Keys               |
| `CLERK_SECRET_KEY`                  | `.env.local`, Cloudflare secret     | Clerk → API Keys               |
| `CLERK_JWT_ISSUER_DOMAIN`           | Convex env vars                     | Clerk → JWT Templates → Issuer |
| `STRIPE_SECRET_KEY`                 | Convex env vars                     | Stripe → API Keys              |
| `STRIPE_WEBHOOK_SECRET`             | Convex env vars                     | Stripe → Webhooks              |
| `NEXT_PUBLIC_SENTRY_DSN`            | `.env.local`, `wrangler.jsonc` vars | Sentry → Project → DSN         |
