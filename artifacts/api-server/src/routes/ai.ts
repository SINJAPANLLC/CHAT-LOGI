import { Router, type IRouter } from "express";
import { db, shipmentsTable, conversationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { StartAiChatBody, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import { openai } from "@workspace/integrations-openai-ai-server";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

function buildSystemPrompt(): string {
  const today = new Date();
  const jst = new Date(today.getTime() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toISOString().slice(0, 10); // YYYY-MM-DD
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  const dayOfWeek = dayNames[jst.getUTCDay()];

  return `あなたはChat LOGIの物流AIアシスタントです。日本語で丁寧かつ簡潔に応答してください。

## 今日の日付
今日は ${dateStr}（${dayOfWeek}曜日）です。「明日」「来週」などの相対表現は必ずこの日付を基準に計算し、提案では必ず「YYYY-MM-DD」形式の具体的な日付で出力してください。

---

## ゴール
3回前後のやり取りで必要情報を集め、最後にプラン提案を出す。

---

## 収集フェーズ（会話の流れ）

### フェーズ1：ルート・日程
以下のうち不足している情報を1つ質問する。
- 積込先（市区町村レベル以上）
- 集荷日（具体的な日付）
- 納品先（市区町村レベル以上）
- 納品希望日（具体的な日付）

### フェーズ2：荷物情報
以下のうち不足している情報を1つ質問する。
- 物量・荷姿（例：パレット10枚、段ボール50箱、機械1台など）
- 付帯作業の有無（手積み・手降ろし、ラッシング、養生など）

### フェーズ3：条件確認 → 即プラン提案
以下を確認してからプランを出す。
- スポット便（単発）か定期便（繰り返し）か
- 高速道路の利用有無

フェーズ3の回答が得られたら、必ずその返答内でプランを提案する。

---

## 質問ルール（厳守）
- 1ターンに質問は1つだけ
- ユーザーが最初のメッセージで複数情報を提供している場合はフェーズを飛ばしてOK
- 車格・台数はAIが荷物量から推定してプランに含める（ユーザーには聞かない）
- フォークリフト有無・細かい寸法・正確な重量は聞かない
- 既に答えた情報は絶対に再度聞かない
- 希望運賃は聞かない（AIが提案する）

---

## 選択肢ボタン（必須）
質問するときは必ず選択肢を以下の形式で出力すること：
<options>["選択肢A", "選択肢B", "選択肢C", "その他"]</options>

例）集荷日を聞く場合：
<options>["今日（${dateStr}）", "明日", "明後日", "来週以降", "日程未定"]</options>

例）荷姿を聞く場合：
<options>["パレット", "段ボール箱", "機械・設備", "バラ積み", "その他"]</options>

例）付帯作業を聞く場合：
<options>["不要", "手積み・手降ろしあり", "ラッシング・養生あり", "複数あり"]</options>

例）スポット/定期を聞く場合：
<options>["スポット（今回のみ）", "定期（繰り返し利用）", "まだ決まっていない"]</options>

例）高速代を聞く場合：
<options>["高速あり（別途請求）", "高速なし（一般道のみ）", "おまかせ"]</options>

---

## プラン提案フォーマット
フェーズ3完了後、以下の形式で提案すること。
提案文の後に必ず <proposal> タグを出力する。
**日付は必ず YYYY-MM-DD HH:MM 形式で出力すること（例：2026-07-24 09:00）。「明日」「翌日」などの表現は使わない。**

<proposal>
{
  "vehicleType": "4tウイング",
  "truckCount": 1,
  "deliveryType": "スポット",
  "deliveryMethod": "チャーター便",
  "pickupAddress": "東京都渋谷区恵比寿",
  "pickupDatetime": "2026-07-24 09:00",
  "deliveryAddress": "大阪府大阪市北区",
  "deliveryDatetime": "2026-07-25 12:00",
  "cargoType": "段ボール箱",
  "cargoQuantity": "50箱",
  "additionalWork": "手積み・手降ろしあり",
  "highwayFee": "別途実費",
  "estimatedPrice": 85000,
  "reason": "パレット20枚・東京〜大阪の距離を考慮した最適プランです。",
  "notes": "高速代は実費別途。手積み作業が発生する場合は追加料金となります。"
}
</proposal>

---

## 料金目安（内部参照）
- 軽貨物：15,000〜25,000円
- 1tトラック：25,000〜35,000円
- 2tトラック：40,000〜55,000円
- 4tトラック：70,000〜90,000円
- 10tトラック：120,000〜150,000円
- 大型トラック：180,000円〜
- 長距離（北海道・九州など）は×1.5、緊急便は×1.3、定期便は×0.85`;
}

// Parse proposal JSON from AI response
function extractProposal(content: string) {
  const match = content.match(/<proposal>([\s\S]*?)<\/proposal>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1].trim());
  } catch {
    return null;
  }
}

// Parse quick-reply options from AI response
function extractOptions(content: string): string[] | null {
  const match = content.match(/<options>(\[[\s\S]*?\])<\/options>/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[1].trim());
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

// Strip special tags from visible message
function stripTags(content: string): string {
  return content
    .replace(/<proposal>[\s\S]*?<\/proposal>/g, "")
    .replace(/<options>[\s\S]*?<\/options>/g, "")
    .trim();
}

// Build message history for OpenAI
function buildMessages(history: { sender: string; message: string }[], newUserMsg?: string) {
  const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
    { role: "system", content: buildSystemPrompt() },
  ];
  for (const h of history) {
    messages.push({
      role: h.sender === "user" ? "user" : "assistant",
      content: h.message,
    });
  }
  if (newUserMsg) {
    messages.push({ role: "user", content: newUserMsg });
  }
  return messages;
}

// Start a new AI consultation
router.post("/ai/start", requireAuth, async (req, res): Promise<void> => {
  const parsed = StartAiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message } = parsed.data;

  // Create shipment record
  const [shipment] = await db
    .insert(shipmentsTable)
    .values({
      userId: req.session.userId,
      requestText: message,
      status: "ヒアリング中",
    })
    .returning();

  // Save user message
  await db.insert(conversationsTable).values({
    shipmentId: shipment.id,
    sender: "user",
    message,
  });

  // Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 1024,
    messages: buildMessages([], message),
  });

  const aiMessage = completion.choices[0]?.message?.content ?? "申し訳ありません。エラーが発生しました。";
  const proposal = extractProposal(aiMessage);
  const options = extractOptions(aiMessage);
  const visibleMessage = stripTags(aiMessage);

  // Save AI response
  await db.insert(conversationsTable).values({
    shipmentId: shipment.id,
    sender: "ai",
    message: visibleMessage,
    structuredData: JSON.stringify({ proposal: proposal || null, options: options || [] }),
  });

  // Update shipment if proposal ready
  if (proposal) {
    await db.update(shipmentsTable).set({
      status: "見積提示",
      vehicleType: proposal.vehicleType,
      deliveryMethod: proposal.deliveryMethod,
      pickupAddress: proposal.pickupAddress ?? null,
      pickupDatetime: proposal.pickupDatetime ?? null,
      deliveryAddress: proposal.deliveryAddress ?? null,
      deliveryDeadline: proposal.deliveryDatetime ?? null,
      cargoType: proposal.cargoType ?? null,
      cargoQuantity: proposal.cargoQuantity ?? null,
      customerPrice: proposal.estimatedPrice?.toString(),
      notes: [
        proposal.additionalWork ? `付帯作業: ${proposal.additionalWork}` : null,
        proposal.highwayFee ? `高速代: ${proposal.highwayFee}` : null,
        proposal.deliveryType ? `配送区分: ${proposal.deliveryType}` : null,
        proposal.truckCount ? `台数: ${proposal.truckCount}台` : null,
        proposal.notes ?? null,
      ].filter(Boolean).join("\n") || null,
      updatedAt: new Date(),
    }).where(eq(shipmentsTable.id, shipment.id));
  }

  res.json({
    message: visibleMessage,
    shipmentId: shipment.id,
    isComplete: !!proposal,
    proposal: proposal || null,
    options: options || [],
  });
});

// Continue conversation
router.post("/shipments/:id/conversations", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, id))
    .limit(1);
  if (!shipment) { res.status(404).json({ error: "案件が見つかりません" }); return; }

  // Load full conversation history
  const history = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.shipmentId, id))
    .orderBy(conversationsTable.createdAt);

  const { message } = parsed.data;

  // Save user message
  await db.insert(conversationsTable).values({
    shipmentId: id,
    sender: "user",
    message,
  });

  // Call OpenAI with full history
  const completion = await openai.chat.completions.create({
    model: "gpt-5.6-luna",
    max_completion_tokens: 1024,
    messages: buildMessages(history, message),
  });

  const aiMessage = completion.choices[0]?.message?.content ?? "申し訳ありません。エラーが発生しました。";
  const proposal = extractProposal(aiMessage);
  const options = extractOptions(aiMessage);
  const visibleMessage = stripTags(aiMessage);

  // Save AI response
  await db.insert(conversationsTable).values({
    shipmentId: id,
    sender: "ai",
    message: visibleMessage,
    structuredData: JSON.stringify({ proposal: proposal || null, options: options || [] }),
  });

  // Update shipment with proposal if ready
  if (proposal) {
    await db.update(shipmentsTable).set({
      status: "見積提示",
      vehicleType: proposal.vehicleType,
      deliveryMethod: proposal.deliveryMethod,
      pickupAddress: proposal.pickupAddress ?? null,
      pickupDatetime: proposal.pickupDatetime ?? null,
      deliveryAddress: proposal.deliveryAddress ?? null,
      deliveryDeadline: proposal.deliveryDatetime ?? null,
      cargoType: proposal.cargoType ?? null,
      cargoQuantity: proposal.cargoQuantity ?? null,
      customerPrice: proposal.estimatedPrice?.toString(),
      notes: [
        proposal.additionalWork ? `付帯作業: ${proposal.additionalWork}` : null,
        proposal.highwayFee ? `高速代: ${proposal.highwayFee}` : null,
        proposal.deliveryType ? `配送区分: ${proposal.deliveryType}` : null,
        proposal.truckCount ? `台数: ${proposal.truckCount}台` : null,
        proposal.notes ?? null,
      ].filter(Boolean).join("\n") || null,
      updatedAt: new Date(),
    }).where(eq(shipmentsTable.id, id));
  }

  res.json({
    message: visibleMessage,
    shipmentId: id,
    isComplete: !!proposal,
    proposal: proposal || null,
    options: options || [],
  });
});

// Get conversation history
router.get("/shipments/:id/conversations", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const msgs = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.shipmentId, id))
    .orderBy(conversationsTable.createdAt);

  res.json(
    msgs.map(m => ({
      ...m,
      createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt,
    }))
  );
});

export default router;
