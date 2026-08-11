import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

/**
 * Singleton Prisma client. Reused across module reloads in dev (tsx watch)
 * to avoid exhausting database connections.
 */
export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"]
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
