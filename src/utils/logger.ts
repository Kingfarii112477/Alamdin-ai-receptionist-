import pino from "pino";
import pretty from "pino-pretty";
import { env } from "../config/env";

// pino's string-based `transport: { target: "pino-pretty" }` spawns a
// worker thread that resolves the module by name at runtime — this breaks
// under any bundler (esbuild/webpack) used by serverless platforms
// (Netlify Functions, Vercel, etc.), since the bundled file has no
// node_modules path for the worker to resolve. Using pino-pretty's direct
// synchronous stream API instead avoids the worker thread entirely, so it
// works the same whether bundled or not.
export const logger = pino(
  { level: env.isTest ? "silent" : env.LOG_LEVEL },
  env.NODE_ENV === "development"
    ? pretty({ colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" })
    : undefined
);
