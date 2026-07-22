import { Router, type IRouter } from "express";
import { db, notificationsTable, usersTable } from "@workspace/db";
import { eq, and, desc, inArray } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { sendEmail, buildEmailHtml } from "../lib/email";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function formatNotification(n: any) {
  return {
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  };
}

// ── ユーザー向け ──────────────────────────────────────────────────────────────

router.get("/notifications", requireAuth, async (req, res): Promise<void> => {
  const notifications = await db
    .select()
    .from(notificationsTable)
    .where(eq(notificationsTable.userId, req.session.userId!))
    .orderBy(desc(notificationsTable.createdAt));
  res.json(notifications.map(formatNotification));
});

router.patch("/notifications/:id/read", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const [notif] = await db
    .update(notificationsTable)
    .set({ readStatus: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, req.session.userId!)))
    .returning();

  if (!notif) { res.status(404).json({ error: "通知が見つかりません" }); return; }
  res.json(formatNotification(notif));
});

// ── 管理者向け ────────────────────────────────────────────────────────────────

// GET /admin/notifications — 送信済み通知の履歴
router.get("/admin/notifications", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select({
    id:         notificationsTable.id,
    title:      notificationsTable.title,
    message:    notificationsTable.message,
    readStatus: notificationsTable.readStatus,
    createdAt:  notificationsTable.createdAt,
    userName:   usersTable.name,
    userEmail:  usersTable.email,
    companyName:usersTable.companyName,
  }).from(notificationsTable)
    .leftJoin(usersTable, eq(notificationsTable.userId, usersTable.id))
    .orderBy(desc(notificationsTable.createdAt));

  res.json(rows.map(r => ({
    ...r,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  })));
});

// POST /admin/notifications/send — 通知メール送信
// body: { userIds?: number[], sendAll?: boolean, subject, body }
router.post("/admin/notifications/send", requireAdmin, async (req, res): Promise<void> => {
  const { userIds, sendAll, subject, body } = req.body;

  if (!subject || !body) {
    res.status(400).json({ error: "件名と本文を入力してください" });
    return;
  }

  // 送信対象ユーザーを取得
  let users;
  if (sendAll) {
    users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(eq(usersTable.role, "user"));
  } else if (Array.isArray(userIds) && userIds.length > 0) {
    users = await db.select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable).where(inArray(usersTable.id, userIds.map(Number)));
  } else {
    res.status(400).json({ error: "送信対象を指定してください" });
    return;
  }

  if (users.length === 0) {
    res.status(400).json({ error: "送信対象のユーザーが見つかりません" });
    return;
  }

  const results: { userId: number; email: string; sent: boolean; reason?: string }[] = [];

  for (const user of users) {
    // DB通知レコード保存
    await db.insert(notificationsTable).values({
      userId:    user.id,
      shipmentId: null as any,
      title:     subject,
      message:   body,
      readStatus: false,
    });

    // メール送信
    const html = buildEmailHtml(subject, body, user.name ?? undefined);
    const result = await sendEmail(user.email, subject, html);
    results.push({ userId: user.id, email: user.email, ...result });
  }

  const sentCount = results.filter(r => r.sent).length;
  res.json({
    message: `${users.length}件に通知を作成、${sentCount}件のメール送信成功`,
    results,
  });
});

export default router;
