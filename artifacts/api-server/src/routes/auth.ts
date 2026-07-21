import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { LoginBody, RegisterBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
    return;
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "メールアドレスまたはパスワードが間違っています" });
    return;
  }

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userEmail = user.email;

  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ user: { ...safeUser, role: user.role, createdAt: user.createdAt.toISOString() } });
});

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { email, password, name, companyName, phone } = parsed.data;

  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (existing) {
    res.status(400).json({ error: "このメールアドレスは既に使用されています" });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash, name, companyName: companyName ?? null, phone: phone ?? null, role: "user" })
    .returning();

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userEmail = user.email;

  const { passwordHash: _ph, ...safeUser } = user;
  res.status(201).json({ user: { ...safeUser, role: user.role, createdAt: user.createdAt.toISOString() } });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => {});
  res.json({ success: true });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session?.userId) {
    res.status(401).json({ error: "未認証" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId))
    .limit(1);

  if (!user) {
    res.status(401).json({ error: "ユーザーが見つかりません" });
    return;
  }

  const { passwordHash: _ph, ...safeUser } = user;
  res.json({ ...safeUser, role: user.role, createdAt: user.createdAt.toISOString() });
});

export default router;
