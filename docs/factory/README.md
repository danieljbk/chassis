# One-Week Startup Factory

Ship a real product every week. The output is not the product — it is you, becoming the person who can build anything.

---

## What counts

A valid ship is a **loop**: a stranger arrives, gets a win, has a reason to come back, and the system gets better because they were there. Anything without a loop is a demo. Demos don't count.

Every product needs exactly four things before you touch code:

1. **Wedge.** A small group with a recurring need. The test: they'd be angry if it disappeared.
2. **Promise.** One sentence. What does this do for the wedge?
3. **Loop.** One sentence. Why does a user return or share?
4. **Proof.** What must be true for the promise to be real? How will you demonstrate it? Where does the wedge gather, and how will you reach them?

If you can't fill these in, the project isn't ready. The **defining insight** is the single reason the loop works and is hard to replace. If you can't name it in one sentence, keep thinking.

## The process

Each cycle produces **(1) a live product** and **(2) one chassis improvement**.

| Day   | What happens                                                                |
| ----- | --------------------------------------------------------------------------- |
| 0     | Fill in wedge, promise, loop, proof. Plan distribution.                     |
| 1     | "Use this template" → new repo. Per-project setup (5 min). Start building.  |
| 1-7   | Build only the defining insight. Everything else is already in the chassis. |
| 7     | Ship live. A stranger can use it end-to-end.                                |
| 8     | Launch post (forced). Begin wedge-targeted distribution.                    |
| 8-14  | Distribute in the background while starting the next cycle.                 |
| After | Fold one improvement back into the chassis template.                        |

**Decide: dig or move.** Every product stays live indefinitely. There is no "freeze." Dig — invest more time — only when the world pulls: repeat use without prompting, inbound from the wedge, payment without persuasion, or a clear expansion path. If none of these appear, the product is done. Move on.

## Distribution

Every product gets an **X/Twitter launch post**. This is non-negotiable.

The launch post is necessary but not sufficient. During Day 0 planning, answer:

- **Where does the wedge live?** Specific communities, forums, channels.
- **What is the message?** One sentence that maps to the promise and makes the wedge feel seen.
- **What is the channel?** The concrete action: a subreddit post, 10 DMs, a Slack comment, a demo video. Be specific.

Distribution overlaps with the next build. You never build and distribute the same product simultaneously.

## Ship standard

A product is live only if it has:

- **End-to-end use** from a clean session
- **Bounded cost** — no unbounded usage path
- **Immediate control** — kill switch and safe mode
- **Push-based visibility** — Sentry alerts you; you never check
- **Self-serve** — no onboarding calls, no manual fulfillment
- **Narrow surface** — small promise, minimal configuration
- **Complete** — zero planned maintenance; the code is good enough that future work is voluntary

No fake launches. No placeholder products. If it needs you weekly, it shouldn't have shipped.

## The discipline

- **One defining insight.** Two is a scope failure.
- **Delete aggressively.** Features don't make loops.
- **Prove, don't claim.** Evidence ships with the product.
- **Needing maintenance is a shipping failure.**
- **The factory improves every cycle.** Compounding is the whole point.

---

## The chassis

The chassis eliminates repeated plumbing so every week starts at the same high baseline.

| Layer        | Tool                                                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Web app      | Next.js                                                                                                                |
| UI           | shadcn/ui                                                                                                              |
| Deploy       | Cloudflare Workers (OpenNext)                                                                                          |
| Auth         | Clerk                                                                                                                  |
| Backend + DB | Convex                                                                                                                 |
| Utilities    | convex-helpers (custom functions, relationships, validators, filter, query cache)                                      |
| Billing      | Stripe via Convex Stripe component                                                                                     |
| Ops          | Sentry + Convex dashboard logs                                                                                         |
| Controls     | Kill switch + safe mode (flags table, enforced by custom function builders) + rate limiting (@convex-dev/rate-limiter) |

**Rule: never rebuild commodity.** Only rebuild a commodity if it becomes the defining insight.

---

**Operational playbooks:** [setup.md](setup.md) (per-project setup) | [cycle.md](cycle.md) (weekly build cycle)
