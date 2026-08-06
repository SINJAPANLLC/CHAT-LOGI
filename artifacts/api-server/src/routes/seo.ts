import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { like } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// GET /admin/seo — 全SEO設定を取得
router.get("/admin/seo", requireAdmin, async (_req, res): Promise<void> => {
  const rows = await db.select().from(settingsTable).where(like(settingsTable.key, "seo_%"));
  const result: Record<string, string> = {};
  for (const row of rows) {
    result[row.key.replace(/^seo_/, "")] = row.value;
  }
  res.json(result);
});

// POST /admin/seo — SEO設定を一括保存
router.post("/admin/seo", requireAdmin, async (req, res): Promise<void> => {
  const body = req.body as Record<string, string>;
  for (const [key, value] of Object.entries(body)) {
    const dbKey = `seo_${key}`;
    await db.insert(settingsTable)
      .values({ key: dbKey, value: String(value), updatedAt: new Date() })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: String(value), updatedAt: new Date() } });
  }
  res.json({ ok: true });
});

export default router;
