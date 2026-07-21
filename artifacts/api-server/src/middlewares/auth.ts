import { Request, Response, NextFunction } from "express";
import { getToken } from "../lib/tokenStore";

function resolveUser(req: Request): boolean {
  // 1. Try Bearer token from Authorization header (primary for browser clients)
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const data = getToken(token);
    if (data) {
      req.session.userId = data.userId;
      req.session.userRole = data.userRole;
      req.session.userEmail = data.userEmail;
      return true;
    }
  }
  // 2. Fallback: session cookie
  if (req.session?.userId) return true;
  return false;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!resolveUser(req)) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!resolveUser(req)) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  if (req.session.userRole !== "admin") {
    res.status(403).json({ error: "管理者権限が必要です" });
    return;
  }
  next();
}

// Augment session type
declare module "express-session" {
  interface SessionData {
    userId: number;
    userRole: string;
    userEmail: string;
  }
}
