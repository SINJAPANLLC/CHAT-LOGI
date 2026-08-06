import { Router, type IRouter } from "express";
import { db, shipmentsTable, conversationsTable, settingsTable } from "@workspace/db";
import { eq, like } from "drizzle-orm";
import { StartAiChatBody, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";
import { calcPriceWithConfig, parsePricingConfig, DEFAULT_CONFIG } from "../lib/pricing";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// ── System prompt (DB優先、フォールバックはハードコード) ────────────────────

const DEFAULT_PROMPT = `あなたはChat LOGIの物流AIアシスタントです。日本語で丁寧かつ簡潔に応答してください。

## 今日の日付
今日は {DATE}（{WEEKDAY}曜日）です。「明日」「来週」などはこの日付を基準に計算し、提案では必ず「YYYY-MM-DD HH:MM」形式で出力してください。

---

## 進め方：3フェーズで情報収集 → プラン提案

各フェーズのチェック項目を順番に確認する。1ターンに質問は必ず1つだけ。
ユーザーが最初から複数情報を提供している場合は、済んだ項目をスキップしてOK。

---

### フェーズ1：ルート・日程（4項目）

1. 集荷先の住所（番地まで）
2. 集荷日時（日付と希望時間帯）
3. 納品先の住所（番地まで）
4. 納品希望日時

→ 4項目が揃ったらフェーズ2へ進む。

---

### フェーズ2：荷物情報（2項目）

5. 物量・荷姿（例：パレット10枚、段ボール50箱、機械1台）
6. 付帯作業の有無（手積み・手降ろし・ラッシング・養生・搬入出など）

→ 2項目が揃ったらフェーズ3へ進む。

---

### フェーズ3：条件確認（3項目）→ プラン提案

7. スポット便（単発）か定期便（繰り返し）か
8. 高速道路の利用有無
9. 備考・特記事項（入構証・フロア・時間指定など。「特になし」でもOK）

→ 9番まで揃ったその返答で、必ず <proposal> タグを出力する。いかなる理由があっても出力を省略してはならない。

---

## 選択肢ボタン（必須）
すべての質問で必ず選択肢を出力すること：
<options>["選択肢A", "選択肢B", "選択肢C"]</options>

集荷日の例：<options>["今日（{DATE}）", "明日", "明後日", "来週以降", "日程未定"]</options>
荷姿の例：<options>["パレット", "段ボール箱", "機械・設備", "バラ積み", "その他"]</options>
付帯作業の例：<options>["不要", "手積み・手降ろし", "ラッシング・養生", "搬入・搬出あり", "複数あり"]</options>
スポット/定期の例：<options>["スポット（今回のみ）", "定期（繰り返し利用）"]</options>
高速代の例：<options>["高速あり", "高速なし（一般道のみ）", "どちらでもOK"]</options>
備考の例：<options>["特になし", "時間指定あり", "入構証が必要", "フロア指定あり", "その他あり"]</options>

---

## <proposal> 出力ルール
- フェーズ3の9番まで回答が揃ったら、その返答の末尾に必ず出力する
- 料金・車格はシステムが計算するため、あなたは情報を正確に埋めることだけに集中すること
- vehicleSize は次の中から選ぶ：軽貨物 / 1t / 2t / 4t / 10t / 大型
- vehicleBodyType は次の中から選ぶ：平ボディ / ウイング / バン / 冷凍冷蔵 / 幌
- truckCount は荷物量から推定する（ユーザーには聞かない）
- highwayUse は true / false で出力する
- isUrgent は集荷日が今日（{DATE}）の場合に true とする
- cargoType は荷物の種類を日本語で入力（例：精密機器、食品、家具、建材）
- cargoQuantity は物量・荷姿を日本語で入力（例：パレット10枚、段ボール50箱）
- additionalWork は付帯作業を日本語で（例：手積み・手降ろし、不要）
- deliveryType は「スポット」または「定期」のどちらか

## <proposal> JSONフォーマット（必須フィールド全て埋めること）
\`\`\`json
{
  "vehicleSize": "2t",
  "vehicleBodyType": "平ボディ",
  "truckCount": 1,
  "pickupAddress": "東京都〇〇区〇〇1-1-1",
  "pickupDatetime": "2026-08-07 10:00",
  "deliveryAddress": "大阪府〇〇市〇〇1-1-1",
  "deliveryDatetime": "2026-08-07 17:00",
  "cargoType": "精密機器",
  "cargoQuantity": "段ボール20箱",
  "additionalWork": "不要",
  "deliveryType": "スポット",
  "highwayUse": true,
  "isUrgent": false,
  "notes": ""
}
\`\`\``;

async function buildSystemPrompt(): Promise<string> {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 9 * 60 * 60 * 1000 + 86400000).toISOString().slice(0, 10);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = dayNames[jst.getUTCDay()];

  let template = DEFAULT_PROMPT;
  let minPrice = DEFAULT_CONFIG.minPrice;
  try {
    const [row] = await db.select().from(settingsTable).where(eq(settingsTable.key, "ai_system_prompt"));
    if (row?.value) template = row.value;
    const pricingRows = await db.select().from(settingsTable).where(like(settingsTable.key, "pricing_%"));
    if (pricingRows.length > 0) minPrice = parsePricingConfig(pricingRows).minPrice;
  } catch { /* DBエラー時はデフォルトを使用 */ }

  return template
    .replace(/\{DATE\}/g, dateStr)
    .replace(/\{WEEKDAY\}/g, dayOfWeek)
    .replace(/\{TOMORROW\}/g, tomorrow)
    .replace(/\{MIN_PRICE\}/g, `¥${minPrice.toLocaleString()}`);
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function repairJson(raw: string): string {
  return raw
    .replace(/,\s*([}\]])/g, '$1')       // trailing commas
    .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // unquoted keys
    .replace(/:\s*'([^']*)'/g, ': "$1"') // single-quoted values
    .trim();
}

function extractProposal(content: string): Record<string, any> | null {
  // 1) <proposal>…</proposal> タグを試みる
  const tagMatch = content.match(/<proposal>([\s\S]*?)<\/proposal>/);
  if (tagMatch) {
    const raw = tagMatch[1].trim();
    try { return JSON.parse(raw); } catch { /* fall through */ }
    try { return JSON.parse(repairJson(raw)); } catch { /* fall through */ }
  }
  // 2) タグなし：レスポンス全体から最初の {...} ブロックを探す
  const jsonMatch = content.match(/\{[\s\S]*"vehicleSize"[\s\S]*\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]); } catch { /* fall through */ }
    try { return JSON.parse(repairJson(jsonMatch[0])); } catch { /* fall through */ }
  }
  return null;
}

function extractOptions(content: string): string[] | null {
  const match = content.match(/<options>(\[[\s\S]*?\])<\/options>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch { return null; }
}

function stripTags(content: string): string {
  return content
    .replace(/<proposal>[\s\S]*?<\/proposal>/g, "")
    .replace(/<options>[\s\S]*?<\/options>/g, "")
    .trim();
}

async function buildMessages(history: { sender: string; message: string }[], newUserMsg?: string) {
  const msgs: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "system", content: await buildSystemPrompt() },
  ];
  for (const h of history) {
    msgs.push({ role: h.sender === "user" ? "user" : "assistant", content: h.message });
  }
  if (newUserMsg) msgs.push({ role: "user", content: newUserMsg });
  return msgs;
}

// Apply proposal data to a DB update object, calculating price via the engine
async function proposalToDbUpdate(proposal: Record<string, any>) {
  const truckCount = Number(proposal.truckCount) || 1;
  const highwayUse = proposal.highwayUse === true || proposal.highwayUse === 'true';

  // DB から料金設定を読み込み（失敗時はデフォルト）
  let pricingCfg = DEFAULT_CONFIG;
  try {
    const rows = await db.select().from(settingsTable).where(like(settingsTable.key, "pricing_%"));
    if (rows.length > 0) pricingCfg = parsePricingConfig(rows);
  } catch { /* デフォルト設定を使用 */ }

  const pricing = calcPriceWithConfig({
    vehicleSize: proposal.vehicleSize ?? '2t',
    vehicleBodyType: proposal.vehicleBodyType ?? '平ボディ',
    truckCount,
    pickupAddress: proposal.pickupAddress,
    deliveryAddress: proposal.deliveryAddress,
    deliveryType: proposal.deliveryType,
    additionalWork: proposal.additionalWork,
    highwayUse,
    isUrgent: proposal.isUrgent ?? false,
  }, pricingCfg);

  // Combined display label e.g. "4tウイング"
  const vehicleType = `${proposal.vehicleSize}${proposal.vehicleBodyType}`;

  return {
    status: "見積提示" as const,
    vehicleType,
    vehicleSize: proposal.vehicleSize ?? null,
    vehicleBodyType: proposal.vehicleBodyType ?? null,
    truckCount,
    deliveryType: proposal.deliveryType ?? null,
    deliveryMethod: proposal.deliveryType === '定期' ? '定期チャーター' : 'スポットチャーター',
    pickupAddress: proposal.pickupAddress ?? null,
    pickupDatetime: proposal.pickupDatetime ?? null,
    deliveryAddress: proposal.deliveryAddress ?? null,
    deliveryDeadline: proposal.deliveryDatetime ?? null,
    cargoType: proposal.cargoType ?? null,
    cargoQuantity: proposal.cargoQuantity ?? null,
    additionalWork: proposal.additionalWork ?? null,
    highwayUse: highwayUse ? 'あり' : 'なし',
    customerPrice: pricing.customerPrice.toString(),
    carrierCost: pricing.carrierCost.toString(),
    grossProfit: pricing.grossProfit.toString(),
    notes: proposal.notes ?? null,
    updatedAt: new Date(),
  };
}

// ── Routes ──────────────────────────────────────────────────────────────────

router.post("/ai/start", requireAuth, async (req, res): Promise<void> => {
  const parsed = StartAiChatBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const { message } = parsed.data;

  const [shipment] = await db.insert(shipmentsTable).values({
    userId: req.session.userId,
    requestText: message,
    status: "ヒアリング中",
  }).returning();

  await db.insert(conversationsTable).values({ shipmentId: shipment.id, sender: "user", message });

  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 1024,
    messages: await buildMessages([], message),
  });

  const aiMessage = completion.choices[0]?.message?.content ?? "申し訳ありません。エラーが発生しました。";
  const proposal = extractProposal(aiMessage);
  const options = extractOptions(aiMessage);
  const visibleMessage = stripTags(aiMessage);

  await db.insert(conversationsTable).values({
    shipmentId: shipment.id,
    sender: "ai",
    message: visibleMessage,
    structuredData: JSON.stringify({ proposal: proposal || null, options: options || [] }),
  });

  if (proposal) {
    await db.update(shipmentsTable).set(await proposalToDbUpdate(proposal)).where(eq(shipmentsTable.id, shipment.id));
  }

  res.json({ message: visibleMessage, shipmentId: shipment.id, isComplete: !!proposal, options: options || [] });
});

router.post("/shipments/:id/conversations", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }

  const [shipment] = await db.select().from(shipmentsTable).where(eq(shipmentsTable.id, id)).limit(1);
  if (!shipment) { res.status(404).json({ error: "案件が見つかりません" }); return; }

  const history = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.shipmentId, id))
    .orderBy(conversationsTable.createdAt);

  const { message } = parsed.data;

  await db.insert(conversationsTable).values({ shipmentId: id, sender: "user", message });

  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 1024,
    messages: await buildMessages(history, message),
  });

  const aiMessage = completion.choices[0]?.message?.content ?? "申し訳ありません。エラーが発生しました。";
  const proposal = extractProposal(aiMessage);
  const options = extractOptions(aiMessage);
  const visibleMessage = stripTags(aiMessage);

  await db.insert(conversationsTable).values({
    shipmentId: id,
    sender: "ai",
    message: visibleMessage,
    structuredData: JSON.stringify({ proposal: proposal || null, options: options || [] }),
  });

  if (proposal) {
    await db.update(shipmentsTable).set(await proposalToDbUpdate(proposal)).where(eq(shipmentsTable.id, id));
  }

  res.json({ message: visibleMessage, shipmentId: id, isComplete: !!proposal, options: options || [] });
});

router.get("/shipments/:id/conversations", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const msgs = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.shipmentId, id))
    .orderBy(conversationsTable.createdAt);

  res.json(msgs.map(m => ({
    ...m,
    createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
  })));
});

export default router;
