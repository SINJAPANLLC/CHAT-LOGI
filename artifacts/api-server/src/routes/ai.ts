import { Router, type IRouter } from "express";
import { db, shipmentsTable, conversationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { StartAiChatBody, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";
import { calcPrice } from "../lib/pricing";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  return parseInt(Array.isArray(raw) ? raw[0] : raw, 10);
}

// ── System prompt (injected with today's date) ──────────────────────────────

function buildSystemPrompt(): string {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().slice(0, 10);
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = dayNames[jst.getUTCDay()];

  return `あなたはChat LOGIの物流AIアシスタントです。日本語で丁寧かつ簡潔に応答してください。

## 今日の日付
今日は ${dateStr}（${dayOfWeek}曜日）です。「明日」「来週」などの相対表現はこの日付を基準に計算し、提案では必ず「YYYY-MM-DD HH:MM」形式で出力してください。

---

## ゴール
3回前後のやり取りで情報を集め、プラン提案を出す。

---

## 収集フェーズ

### フェーズ1：ルート・日程
不足しているものを1つ質問する。
- 積込先（市区町村レベル以上）
- 集荷日時
- 納品先（市区町村レベル以上）
- 納品希望日時

### フェーズ2：荷物情報
不足しているものを1つ質問する。
- 物量・荷姿（パレット何枚・段ボール何箱など）
- 付帯作業の有無（手積み・手降ろし・ラッシング・養生など）

### フェーズ3：条件確認 → 即プラン提案
以下を確認したらプランを出す。
- スポット（単発）か定期（繰り返し）か
- 高速道路の利用有無
- 特記事項・備考があれば確認

フェーズ3の回答が得られたら必ずその返答内でプランを提案する。

---

## 質問ルール（厳守）
- 1ターンに質問は1つだけ
- ユーザーが最初から複数情報を提供している場合はフェーズをスキップしてOK
- 既に答えた情報は絶対に再度聞かない
- 希望運賃・車格は聞かない（システムが計算・推定する）
- フォークリフト有無・細かい寸法・正確な重量は聞かない

---

## 選択肢ボタン（必須）
質問するときは必ず以下の形式で選択肢を出力すること：
<options>["選択肢A", "選択肢B", "選択肢C"]</options>

例）集荷日を聞く場合：
<options>["今日（${dateStr}）", "明日", "明後日", "来週以降", "日程未定"]</options>

例）荷姿を聞く場合：
<options>["パレット", "段ボール箱", "機械・設備", "バラ積み", "その他"]</options>

例）付帯作業を聞く場合：
<options>["不要", "手積み・手降ろし", "ラッシング・養生", "搬入・搬出あり", "複数あり"]</options>

例）スポット/定期を聞く場合：
<options>["スポット（今回のみ）", "定期（繰り返し利用）"]</options>

例）高速代を聞く場合：
<options>["高速あり", "高速なし（一般道のみ）", "おまかせ"]</options>

---

## プラン提案フォーマット
フェーズ3完了後、提案文の後に必ず <proposal> タグを出力する。
料金・車格はシステムが計算するため、あなたは情報を正確に構造化して出力することだけに集中すること。

**vehicleSize の選択肢（必ずこの中から1つ）：**
軽貨物 / 1t / 2t / 4t / 10t / 大型

**vehicleBodyType の選択肢（必ずこの中から1つ）：**
平ボディ / ウイング / バン / 冷凍冷蔵 / 幌

<proposal>
{
  "vehicleSize": "4t",
  "vehicleBodyType": "ウイング",
  "truckCount": 1,
  "deliveryType": "スポット",
  "pickupAddress": "東京都渋谷区恵比寿1丁目",
  "pickupDatetime": "2026-07-24 09:00",
  "deliveryAddress": "大阪府大阪市北区梅田2丁目",
  "deliveryDatetime": "2026-07-25 12:00",
  "cargoType": "段ボール箱",
  "cargoQuantity": "50箱",
  "additionalWork": "手積み・手降ろしあり",
  "highwayUse": true,
  "isUrgent": false,
  "notes": "2階への搬入あり。入構証が必要。"
}
</proposal>`;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function extractProposal(content: string) {
  const match = content.match(/<proposal>([\s\S]*?)<\/proposal>/);
  if (!match) return null;
  try { return JSON.parse(match[1].trim()); } catch { return null; }
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

function buildMessages(history: { sender: string; message: string }[], newUserMsg?: string) {
  const msgs: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "system", content: buildSystemPrompt() },
  ];
  for (const h of history) {
    msgs.push({ role: h.sender === "user" ? "user" : "assistant", content: h.message });
  }
  if (newUserMsg) msgs.push({ role: "user", content: newUserMsg });
  return msgs;
}

// Apply proposal data to a DB update object, calculating price via the engine
function proposalToDbUpdate(proposal: Record<string, any>) {
  const truckCount = Number(proposal.truckCount) || 1;
  const highwayUse = proposal.highwayUse === true || proposal.highwayUse === 'true';

  const pricing = calcPrice({
    vehicleSize: proposal.vehicleSize ?? '2t',
    vehicleBodyType: proposal.vehicleBodyType ?? '平ボディ',
    truckCount,
    pickupAddress: proposal.pickupAddress,
    deliveryAddress: proposal.deliveryAddress,
    deliveryType: proposal.deliveryType,
    additionalWork: proposal.additionalWork,
    highwayUse,
    isUrgent: proposal.isUrgent ?? false,
  });

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
    messages: buildMessages([], message),
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
    await db.update(shipmentsTable).set(proposalToDbUpdate(proposal)).where(eq(shipmentsTable.id, shipment.id));
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
    messages: buildMessages(history, message),
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
    await db.update(shipmentsTable).set(proposalToDbUpdate(proposal)).where(eq(shipmentsTable.id, id));
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
