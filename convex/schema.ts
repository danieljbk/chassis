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
