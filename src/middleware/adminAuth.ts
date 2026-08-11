import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { AppError } from "./errorHandler";

/**
 * Protects staff-only endpoints (appointment listing, status changes, admin
 * dashboard) with a shared secret. Patients never see this key — it's not
 * exposed anywhere in the public web chat UI.
 */
export function adminAuth(req: Request, _res: Response, next: NextFunction) {
  const key = req.header("X-Admin-Key");
  if (!key || key !== env.ADMIN_API_KEY) {
    throw new AppError(401, "Unauthorized");
  }
  next();
}
