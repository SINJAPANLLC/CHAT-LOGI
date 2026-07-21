import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";
import { generateToken, setToken, deleteToken, getToken } from "../lib/tokenStore";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(user: any) {
  const { passwordHash: _ph, ...safe } = user;
  return { ...safe, role: user.role, createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt };
}

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
    return;
  }

  // Generate auth token (works regardless of cookie support)
  const token = generateToken();
  setToken(token, { userId: user.id, userRole: user.role, userEmail: user.email });

  // Also set session (belt and suspenders)
  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userEmail = user.email;

  res.json({ user: formatUser(user), token });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, name, companyName, phone } = parsed.data;

  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (existing) {
    res.status(400).json({ error: "このメールアドレスは既に使用されています" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, companyName: companyName ?? null, phone: phone ?? null, role: "user" })
    .returning();

  const token = generateToken();
  setToken(token, { userId: user.id, userRole: user.role, userEmail: user.email });

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userEmail = user.email;

  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/logout", (req, res): void => {
  // Delete token if provided
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    deleteToken(authHeader.slice(7));
  }
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "ユーザーが見つかりません" });
    return;
  }
  res.json(formatUser(user));
});

export default router;
