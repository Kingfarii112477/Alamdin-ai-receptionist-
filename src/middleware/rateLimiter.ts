import rateLimit from "express-rate-limit";
import type { Request } from "express";
import { env } from "../config/env";

/**
 * express-rate-limit's default key generator throws if req.ip is undefined
 * (ERR_ERL_UNDEFINED_IP_ADDRESS) rather than degrade gracefully. Some
 * serverless runtimes (observed via Netlify Functions' local emulator, and
 * plausibly other providers) don't always populate req.ip the way a
 * traditional Node server behind a simple reverse proxy does. Falling back
 * to X-Forwarded-For directly, and finally to a shared bucket, keeps the
 * API answering instead of hard-crashing every request on those platforms.
 */
function resolveClientKey(req: Request): string {
  if (req.ip) return req.ip;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export const apiRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: resolveClientKey,
  message: { error: "Too many requests, please try again shortly." }
});
