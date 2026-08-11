import path from "node:path";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { apiRateLimiter } from "./middleware/rateLimiter";
import { apiV1Router, healthRouter } from "./routes";
import { logger } from "./utils/logger";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(
    helmet({
      contentSecurityPolicy: false // static web/ UI is self-hosted, same-origin; kept simple for the test UI
    })
  );

  const corsOrigins = env.CORS_ORIGIN === "*" ? true : env.CORS_ORIGIN.split(",").map((o) => o.trim());
  app.use(cors({ origin: corsOrigins }));

  app.use(express.json({ limit: "100kb" }));

  if (!env.isTest) {
    app.use(pinoHttp({ logger }));
  }

  app.use(healthRouter);
  app.use("/api/v1", apiRateLimiter, apiV1Router);

  app.use(express.static(path.join(__dirname, "..", "web", "public")));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
