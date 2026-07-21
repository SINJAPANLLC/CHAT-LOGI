import { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
    res.status(401).json({ error: "認証が必要です" });
    return;
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.session?.userId) {
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
