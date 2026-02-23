# Weekly Build Cycle

Each cycle produces a live product and one chassis improvement. This is the operational playbook.

---

## Day 0: Define

No code today. Fill in four things or the project isn't ready.

### The four requirements

1. **Wedge.** A small group with a recurring need. The test: they'd be angry if it disappeared.
2. **Promise.** One sentence. What does this do for the wedge?
3. **Loop.** One sentence. Why does a user return or share?
4. **Proof.** What must be true for the promise to be real? How will you demonstrate it?

### The defining insight

The single reason the loop works and is hard to replace. If you can't name it in one sentence, keep thinking. Everything you build this week serves this insight. Everything else is already in the chassis or doesn't matter.

Two defining insights is a scope failure. Pick one.

### Distribution plan

Answer these before writing code, because they shape what you build:

- **Where does the wedge live?** Specific communities, forums, channels, subreddits.
- **What is the message?** One sentence that maps to the promise and makes the wedge feel seen.
- **What is the channel?** The concrete action: a subreddit post, 10 DMs, a Slack message, a demo video. Be specific.

### When to abort

If you can't fill in all four requirements after honest effort, the project isn't ready. Abandon it. Starting a project you can't define wastes the whole week. It is better to spend another day on Day 0 than to build something without a loop.

---

## Day 1: Start building

### Project setup

Follow [setup.md](setup.md) to go from template to running app. This should take about 5 minutes.

### Extend the schema

Add your product's tables to `convex/schema.ts` alongside the existing `flags` table. The flags table is chassis infrastructure; don't remove it.

```ts
export default defineSchema({
  flags: defineTable({
    key: v.string(),
    killSwitch: v.boolean(),
    safeMode: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // Your product tables go here
});
```

### Write functions using the chassis builders

Import from `convex/functions.ts`, not from `convex/_generated/server`. The chassis builders enforce auth and check the kill switch automatically.

```ts
import { authedMutation } from "./functions";
import { v } from "convex/values";

export const createThing = authedMutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    // ctx.identity is guaranteed non-null
    // ctx.flags.killSwitch has already been checked
    // ctx.flags.safeMode is available for gating side effects
    return await ctx.db.insert("things", {
      name: args.name,
      userId: ctx.identity.subject,
    });
  },
});
```

### Rate-limit costful operations

For anything that costs money or calls an external API, add a rate limit check. Define limits in `convex/lib/rateLimits.ts`, then call `rateLimiter.limit` in your function:

```ts
import { rateLimiter } from "./lib/rateLimits";

export const generate = authedMutation({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    await rateLimiter.limit(ctx, "generateContent", {
      key: ctx.identity.subject,
    });
    // proceed with the costful operation
  },
});
```

### Use safe mode for side effects

When `ctx.flags.safeMode` is true, skip side effects (sending emails, calling external APIs, charging money) but keep the core loop functional. This lets you degrade gracefully without pulling the kill switch.

```ts
if (!ctx.flags.safeMode) {
  await sendEmail(ctx.identity.email, "Welcome!");
}
```

---

## Days 1--7: Build the defining insight

### What to build

Build only the defining insight. The chassis already handles:

- Auth (Clerk + `authedQuery`/`authedMutation`/`authedAction`)
- Billing (Stripe + `@convex-dev/stripe`)
- Error alerting (Sentry)
- Kill switch and safe mode (flags table + custom function builders)
- Rate limiting (`@convex-dev/rate-limiter`)
- Deploy pipeline (Cloudflare Workers via OpenNext)

If you're building something from the list above, you're rebuilding commodity. Stop unless it's the defining insight.

### Scope discipline

- **One defining insight.** If you're working on a second feature, you've lost scope.
- **Delete aggressively.** Features don't make loops. If it doesn't serve the insight, delete it.
- **Run the loop test.** Before adding anything, ask: does a stranger arrive, get a win, have a reason to come back, and does the system get better because they were there? If the addition doesn't strengthen this, it doesn't belong.

---

## Day 7: Ship

### Ship standard checklist

A product is live only if it has:

- [ ] **End-to-end use** from a clean session (incognito browser, no prior state)
- [ ] **Bounded cost** — no unbounded usage path that could run up a bill
- [ ] **Immediate control** — kill switch and safe mode are wired and tested
- [ ] **Push-based visibility** — Sentry alerts you; you never check
- [ ] **Self-serve** — no onboarding calls, no manual fulfillment
- [ ] **Narrow surface** — small promise, minimal configuration
- [ ] **Complete** — zero planned maintenance

### Deploy

```bash
bun run deploy:worker
```

### Insert the global flags row

In the Convex dashboard, go to your deployment's data viewer and insert a row into the `flags` table:

```json
{
  "key": "global",
  "killSwitch": false,
  "safeMode": false,
  "updatedAt": 0
}
```

Without this row, the chassis defaults to `killSwitch: false, safeMode: false` — which is fine. But inserting it gives you a toggle you can flip from the dashboard without deploying code.

### Verify Sentry

Throw a deliberate error in production and confirm it appears in Sentry. Check that your alert rules fire. The ship standard requires push-based visibility — if Sentry isn't alerting, the product isn't live.

### Final pass

Visit the deployed URL in an incognito browser. Walk through the entire loop as a stranger. If anything breaks, fix it before calling it shipped.

---

## Day 8: Launch

### The required post

Every product gets an X/Twitter launch post. This is non-negotiable. Write it using the message from your Day 0 distribution plan.

### Execute the distribution plan

Post in the communities where the wedge lives. Use the channel you planned on Day 0. If you didn't plan distribution, you skipped a step — go back and do it now.

---

## Days 8--14: Distribute

Distribution overlaps with the next cycle. You never build and distribute the same product simultaneously.

### What to watch for

- **Repeat use without prompting** — users coming back on their own
- **Inbound from the wedge** — people finding you without you reaching out
- **Payment without persuasion** — someone paying without being asked twice
- **A clear expansion path** — an obvious next step that the wedge is asking for

These are the signals that justify digging deeper.

---

## After: Dig or move

Every product stays live indefinitely. There is no "freeze."

**Dig** — invest more time — only when the world pulls. The four signals above are the test. If any of them appear, the product has earned more attention.

**Move** — if none of the signals appear, the product is done. It stays live, but you stop working on it. No shame; the output was you learning to build, not the product itself.

### Improve the chassis

Each cycle produces one chassis improvement. Before moving on, identify one thing that was painful or repeated, and fold the fix back into the chassis template repo. This is how the factory compounds.
