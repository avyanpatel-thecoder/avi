import { getAuth } from "@clerk/express";
import type { Request, RequestHandler } from "express";

export function getClerkUserId(req: Request): string | null {
  return getAuth(req).userId ?? null;
}

export const requireAuth: RequestHandler = (req, res, next) => {
  if (!getClerkUserId(req)) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
};