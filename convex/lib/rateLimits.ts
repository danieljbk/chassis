import { RateLimiter, MINUTE, HOUR } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

export const rateLimiter = new RateLimiter(components.rateLimiter, {
  generateContent: { kind: "fixed window", rate: 60, period: HOUR },
  sendEmail: { kind: "fixed window", rate: 10, period: MINUTE },
});
