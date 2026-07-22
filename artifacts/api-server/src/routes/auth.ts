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
  await setToken(token, { userId: user.id, userRole: user.role, userEmail: user.email });

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
  await setToken(token, { userId: user.id, userRole: user.role, userEmail: user.email });

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userEmail = user.email;

  res.status(201).json({ user: formatUser(user), token });
});

router.post("/auth/logout", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    await deleteToken(authHeader.slice(7));
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

router.patch("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const { name, companyName, phone, billingAddress, cardHolderName, cardBrand, cardLast4, cardExpiry, currentPassword, newPassword } = req.body as {
    name?: string;
    companyName?: string;
    phone?: string;
    billingAddress?: string;
    cardHolderName?: string;
    cardBrand?: string;
    cardLast4?: string;
    cardExpiry?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user) {
    res.status(401).json({ error: "ユーザーが見つかりません" });
    return;
  }

  const updates: Partial<typeof usersTable.$inferInsert> = {};

  if (name !== undefined) updates.name = name;
  if (companyName !== undefined) updates.companyName = companyName;
  if (phone !== undefined) updates.phone = phone;
  if (billingAddress !== undefined) updates.billingAddress = billingAddress;
  if (cardHolderName !== undefined) updates.cardHolderName = cardHolderName;
  if (cardBrand !== undefined) updates.cardBrand = cardBrand;
  if (cardLast4 !== undefined) updates.cardLast4 = cardLast4;
  if (cardExpiry !== undefined) updates.cardExpiry = cardExpiry;

  if (newPassword) {
    if (!currentPassword) {
      res.status(400).json({ error: "現在のパスワードを入力してください" });
      return;
    }
    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      res.status(400).json({ error: "現在のパスワードが正しくありません" });
      return;
    }
    updates.passwordHash = await bcrypt.hash(newPassword, 10);
  }

  if (Object.keys(updates).length === 0) {
    res.json(formatUser(user));
    return;
  }

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  res.json(formatUser(updated));
});

export default router;
