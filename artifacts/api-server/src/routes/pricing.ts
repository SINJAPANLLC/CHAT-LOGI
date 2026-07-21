import { Router, type IRouter } from "express";
import { db, pricingRulesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreatePricingRuleBody, UpdatePricingRuleBody } from "@workspace/api-zod";
import { requireAuth, requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

function formatRule(r: any) {
  return {
    ...r,
    value: Number(r.value),
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/pricing-rules", requireAuth, async (_req, res): Promise<void> => {
  const rules = await db.select().from(pricingRulesTable).orderBy(pricingRulesTable.id);
  res.json(rules.map(formatRule));
});

router.post("/pricing-rules", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreatePricingRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [rule] = await db.insert(pricingRulesTable).values({
    ...parsed.data,
    value: parsed.data.value.toString(),
  }).returning();
  res.status(201).json(formatRule(rule));
});

router.patch("/pricing-rules/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const parsed = UpdatePricingRuleBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: any = { ...parsed.data };
  if (updateData.value !== undefined) updateData.value = updateData.value.toString();

  const [rule] = await db.update(pricingRulesTable).set(updateData).where(eq(pricingRulesTable.id, id)).returning();
  if (!rule) { res.status(404).json({ error: "料金ルールが見つかりません" }); return; }
  res.json(formatRule(rule));
});

router.delete("/pricing-rules/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }
  await db.delete(pricingRulesTable).where(eq(pricingRulesTable.id, id));
  res.json({ success: true });
});

export default router;
