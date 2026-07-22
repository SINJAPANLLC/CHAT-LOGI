import { Router, type IRouter } from "express";
import { db, shipmentsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { randomUUID } from "crypto";

const router: IRouter = Router();

const SQUARE_BASE = "https://connect.squareup.com";

function squareFetch(path: string, method: string, body?: object) {
  return fetch(`${SQUARE_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      "Square-Version": "2024-11-20",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// POST /square/authorize
// フロントエンドからsourceId（カードトークン）を受け取り、Squareで与信確保（オーソリ）
router.post("/square/authorize", requireAuth, async (req, res): Promise<void> => {
  const { shipmentId, sourceId } = req.body;
  if (!shipmentId || !sourceId) {
    res.status(400).json({ error: "shipmentId と sourceId は必須です" });
    return;
  }

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, Number(shipmentId))).limit(1);
  if (!shipment) { res.status(404).json({ error: "案件が見つかりません" }); return; }

  const amountYen = Math.round(Number(shipment.customerPrice) * 1.1); // 税込

  const squareRes = await squareFetch("/v2/payments", "POST", {
    source_id: sourceId,
    idempotency_key: randomUUID(),
    amount_money: { amount: amountYen, currency: "JPY" },
    location_id: process.env.SQUARE_LOCATION_ID,
    autocomplete: false, // オーソリのみ（キャプチャは納品後）
    note: `Chat LOGI 案件 #${shipment.id}`,
  });

  const data = await squareRes.json() as any;
  if (!squareRes.ok) {
    res.status(502).json({ error: "Square API エラー", detail: data.errors });
    return;
  }

  const paymentId = data.payment?.id;

  // squarePaymentIdを案件に保存
  await db.update(shipmentsTable).set({
    squarePaymentId: paymentId,
    squareCaptured: "false",
    paymentMethod: "card",
    paymentStatus: "決済処理中",
    updatedAt: new Date(),
  }).where(eq(shipmentsTable.id, Number(shipmentId)));

  res.json({ paymentId, status: data.payment?.status });
});

// POST /square/capture/:paymentId — 納品完了後に管理者がキャプチャ
router.post("/square/capture/:squarePaymentId", requireAdmin, async (req, res): Promise<void> => {
  const { squarePaymentId } = req.params;

  const squareRes = await squareFetch(`/v2/payments/${squarePaymentId}/complete`, "POST", {});
  const data = await squareRes.json() as any;

  if (!squareRes.ok) {
    res.status(502).json({ error: "Square キャプチャ失敗", detail: data.errors });
    return;
  }

  // 案件のsquareCapturedを更新
  await db.update(shipmentsTable).set({
    squareCaptured: "true",
    paymentStatus: "決済完了",
    status: "請求完了",
    updatedAt: new Date(),
  }).where(eq(shipmentsTable.squarePaymentId, squarePaymentId));

  res.json({ status: data.payment?.status });
});

// POST /square/cancel/:squarePaymentId — キャンセル
router.post("/square/cancel/:squarePaymentId", requireAdmin, async (req, res): Promise<void> => {
  const { squarePaymentId } = req.params;

  const squareRes = await squareFetch(`/v2/payments/${squarePaymentId}/cancel`, "POST", {});
  const data = await squareRes.json() as any;

  if (!squareRes.ok) {
    res.status(502).json({ error: "Square キャンセル失敗", detail: data.errors });
    return;
  }

  await db.update(shipmentsTable).set({
    squareCaptured: "cancelled",
    paymentStatus: "未決済",
    updatedAt: new Date(),
  }).where(eq(shipmentsTable.squarePaymentId, squarePaymentId));

  res.json({ ok: true });
});

export default router;
