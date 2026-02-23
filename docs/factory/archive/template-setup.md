# Template Setup Reference (Historical)

This documents how the chassis template was built. The template is complete.
For per-project setup, see [setup.md](../setup.md).

---

### Prereqs

- Bun, Node.js 20+
- Accounts: Cloudflare, Convex, Clerk, Stripe

### 1) Scaffold

```bash
bun create convex@latest my-app -- -t nextjs-clerk-shadcn
cd my-app
bun install
bun run dev
```

Confirm the app loads with Clerk wiring present.

```bash
bun add convex-helpers @convex-dev/rate-limiter
```

Add `ConvexQueryCacheProvider` inside `ConvexProviderWithClerk` in the root layout:

```tsx
import { ConvexQueryCacheProvider } from "convex-helpers/react/cache";

<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
  <ConvexQueryCacheProvider>{children}</ConvexQueryCacheProvider>
</ConvexProviderWithClerk>;
```

### 2) Clerk auth

1. Create a JWT template in Clerk named `convex`.
2. Set `CLERK_JWT_ISSUER_DOMAIN` in Convex dev deployment env vars.
3. Enable the Clerk provider in `convex/auth.config.ts`.
4. Verify: sign in, confirm `ctx.auth.getUserIdentity()` returns non-null.

### 3) Cloudflare Workers (OpenNext)

```bash
bun add --dev @opennextjs/cloudflare@latest wrangler@latest
```

Create `wrangler.jsonc`:

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "my-app",
  "main": ".open-next/worker.js",
  "compatibility_date": "2026-02-23",
  "compatibility_flags": ["nodejs_compat", "global_fetch_strictly_public"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS",
  },
  "services": [
    {
      "binding": "WORKER_SELF_REFERENCE",
      "service": "my-app",
    },
  ],
  "images": {
    "binding": "IMAGES",
  },
}
```

Add to `package.json`:

```json
{
  "scripts": {
    "build:worker": "opennextjs-cloudflare build",
    "preview:worker": "opennextjs-cloudflare build && opennextjs-cloudflare preview",
    "deploy:worker": "opennextjs-cloudflare build && opennextjs-cloudflare deploy"
  }
}
```

Additional:

- `public/_headers`: cache `/_next/static/*` with `max-age=31536000, immutable`
- `.dev.vars`: `NEXTJS_ENV=development`
- `next.config.ts`: call `initOpenNextCloudflareForDev()` from `@opennextjs/cloudflare`
- Add `.open-next` to `.gitignore`

Verify: `bun run preview:worker` loads the app.

### 4) Environment variables

**Cloudflare (frontend/SSR):** `bunx wrangler secret put CLERK_SECRET_KEY`. Non-secrets go in `"vars"` in `wrangler.jsonc`.

**Convex (backend):** Stripe keys, Clerk issuer domain. Set per deployment (dev/prod) in Convex Dashboard.

### 5) Stripe billing

```bash
bun add @convex-dev/stripe
```

`convex/convex.config.ts` (Step 6 extends this file):

```ts
import { defineApp } from "convex/server";
import stripe from "@convex-dev/stripe/convex.config.js";

const app = defineApp();
app.use(stripe);

export default app;
```

`convex/http.ts`:

```ts
import { httpRouter } from "convex/server";
import { components } from "./_generated/api";
import { registerRoutes } from "@convex-dev/stripe";

const http = httpRouter();
registerRoutes(http, components.stripe, { webhookPath: "/stripe/webhook" });
export default http;
```

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Convex env vars. Create the webhook in Stripe Dashboard pointing at `https://<deployment>.convex.site/stripe/webhook`.

Subscribe to: `checkout.session.completed`, `customer.created`, `customer.updated`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.created`, `invoice.finalized`, `invoice.paid`, `invoice.payment_failed`, `payment_intent.succeeded`, `payment_intent.payment_failed`.

You must include `invoice.finalized` or subscription tables will be empty after checkout.

### 6) Controls

**Schema** — `convex/schema.ts`:

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  flags: defineTable({
    key: v.string(),
    killSwitch: v.boolean(),
    safeMode: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),
});
```

No `usage` table — the rate limiter manages its own state.

**Rate limiter** — update `convex/convex.config.ts`:

```ts
import { defineApp } from "convex/server";
import stripe from "@convex-dev/stripe/convex.config.js";
import rateLimiter from "@convex-dev/rate-limiter/convex.config.js";

const app = defineApp();
app.use(stripe);
app.use(rateLimiter);

export default app;
```

`convex/lib/rateLimits.ts`:

```ts
import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  generateContent: { kind: "fixed window", rate: 60, period: HOUR },
  sendEmail: { kind: "fixed window", rate: 10, period: MINUTE },
});
```

**Custom function builders** — `convex/functions.ts`:

```ts
import {
  customQuery,
  customMutation,
  customAction,
} from "convex-helpers/server/customFunctions";
import {
  query,
  mutation,
  action,
  QueryCtx,
  MutationCtx,
} from "./_generated/server";

type DbCtx = QueryCtx | MutationCtx;

async function getAuthAndFlags(ctx: DbCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const row = await ctx.db
    .query("flags")
    .withIndex("by_key", (q) => q.eq("key", "global"))
    .unique();
  const flags = row
    ? { killSwitch: row.killSwitch, safeMode: row.safeMode }
    : { killSwitch: false, safeMode: false };
  if (flags.killSwitch) throw new Error("Service temporarily disabled");

  return { identity, flags };
}

export const authedQuery = customQuery(query, {
  args: {},
  input: async (ctx) => {
    const { identity, flags } = await getAuthAndFlags(ctx);
    return { ctx: { identity, flags }, args: {} };
  },
});

export const authedMutation = customMutation(mutation, {
  args: {},
  input: async (ctx) => {
    const { identity, flags } = await getAuthAndFlags(ctx);
    return { ctx: { identity, flags }, args: {} };
  },
});

export const authedAction = customAction(action, {
  args: {},
  input: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    return { ctx: { identity }, args: {} };
  },
});
```

Use `authedMutation` instead of `mutation` everywhere. Queries and mutations get `ctx.identity` and `ctx.flags`; actions get `ctx.identity` only. For costful operations, call `rateLimiter.limit(ctx, "generateContent", { key: ctx.identity.subject })`.

### 7) Sentry

```bash
bun add @sentry/nextjs
bunx @sentry/wizard@latest -i nextjs
```

The DSN is a public write-only endpoint. Set it as a build-time env var:

- `wrangler.jsonc` → `"vars": { "NEXT_PUBLIC_SENTRY_DSN": "https://..." }`
- `.env.local` → `NEXT_PUBLIC_SENTRY_DSN=https://...`

Update Sentry config files to read `process.env.NEXT_PUBLIC_SENTRY_DSN`.

### 8) Done when

- `bun run dev` works end-to-end
- `bun run preview:worker` works under Workers runtime
- `bun run deploy:worker` deploys and the URL loads
- Stripe test webhooks reach Convex
- `authedMutation` enforces auth and kill switch automatically
- Rate limiter blocks abuse
- Safe mode disables side effects without breaking the loop
- Sentry captures errors without manual checking

Mark the repo as a **GitHub template**.

### Per-project setup (5 minutes)

1. "Use this template" → new repo
2. `bun install && bun run dev`
3. New Clerk app → set `CLERK_JWT_ISSUER_DOMAIN` in Convex
4. New Convex project → update `.env.local`
5. New Stripe webhook → set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Convex
6. Set `NEXT_PUBLIC_SENTRY_DSN` in `.env.local`
7. Build the product
