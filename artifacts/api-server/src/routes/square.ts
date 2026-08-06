import { Router, type IRouter } from "express";
import { db, shipmentsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, requireAdmin } from "../middlewares/auth";
import { randomUUID } from "crypto";
import { squareFetch, authorizeOnFile } from "../lib/square-authorize";

const router: IRouter = Router();

// POST /square/register-card — 依頼承認時にカードを顧客として登録（Card on File）
router.post("/square/register-card", requireAuth, async (req, res): Promise<void> => {
  const { sourceId } = req.body;
  if (!sourceId) { res.status(400).json({ error: "sourceId は必須です" }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId!)).limit(1);
  if (!user) { res.status(404).json({ error: "ユーザーが見つかりません" }); return; }

  // すでにSquare顧客が存在する場合は新しいカードを追加
  let customerId = user.squareCustomerId;

  if (!customerId) {
    // Square Customerを新規作成
    const custRes = await squareFetch("/v2/customers", "POST", {
      idempotency_key: randomUUID(),
      email_address: user.email,
      given_name: user.name,
      company_name: user.companyName ?? undefined,
      phone_number: user.phone ?? undefined,
      reference_id: String(user.id),
    });
    const custData = await custRes.json() as any;
    if (!custRes.ok) {
      console.error("[Square] 顧客作成失敗:", JSON.stringify(custData.errors));
      res.status(502).json({ error: "Square顧客作成失敗", detail: custData.errors });
      return;
    }
    customerId = custData.customer.id;
  }

  // Card on File を作成
  const cardRes = await squareFetch("/v2/cards", "POST", {
    idempotency_key: randomUUID(),
    source_id: sourceId,
    card: {
      customer_id: customerId,
      cardholder_name: user.name,
    },
  });
  const cardData = await cardRes.json() as any;
  if (!cardRes.ok) {
    console.error("[Square] カード登録失敗 status:", cardRes.status, "errors:", JSON.stringify(cardData.errors));
    res.status(502).json({ error: "Squareカード登録失敗", detail: cardData.errors });
    return;
  }

  const card = cardData.card;
  // ユーザーにSquare顧客IDとカードIDを保存
  await db.update(usersTable).set({
    squareCustomerId: customerId,
    squareCardId: card.id,
    cardBrand: card.card_brand ?? null,
    cardLast4: card.last_4 ?? null,
    cardExpiry: card.exp_month && card.exp_year ? `${card.exp_month}/${card.exp_year}` : null,
  }).where(eq(usersTable.id, user.id));

  res.json({ customerId, cardId: card.id, brand: card.card_brand, last4: card.last_4 });
});

// POST /square/authorize-on-file/:shipmentId — 配車確定時に登録済みカードでオーソリ
router.post("/square/authorize-on-file/:shipmentId", requireAdmin, async (req, res): Promise<void> => {
  const shipmentId = Number(req.params.shipmentId);
  if (isNaN(shipmentId)) { res.status(400).json({ error: "無効なID" }); return; }

  const result = await authorizeOnFile(shipmentId);
  if ("error" in result) { res.status(400).json(result); return; }
  res.json(result);
});

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

  const squareRes = await squareFetch("/v2/payments", "POST", {
    source_id: sourceId,
    idempotency_key: randomUUID(),
    amount_money: { amount: 1, currency: "JPY" }, // カード確認用1円オーソリ
    location_id: process.env.SQUARE_LOCATION_ID,
    autocomplete: false, // オーソリのみ（キャプチャは納品後）
    note: `Chat LOGI 案件 #${shipment.id}`,
  });

  const data = await squareRes.json() as any;
  if (!squareRes.ok) {
    console.error("[Square] /v2/payments エラー status:", squareRes.status, "errors:", JSON.stringify(data.errors));
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
