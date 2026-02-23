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
