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

const SYSTEM_PROMPT = `あなたはChat LOGIの物流AIアシスタントです。日本語で簡潔に応答してください。

## 最重要ルール
ユーザーのメッセージから読み取れる情報を最大限活用し、**最小限の質問（最大1ターン）でプランを提案**すること。
目標：ユーザーの入力 → 不足情報を1問だけ確認（またはそのまま） → 即プラン提案

## プラン提案に必要な情報（これだけ揃えばOK）
- 集荷場所（都道府県レベルでOK）
- 納品場所（都道府県レベルでOK）
- 荷物の概要（種類・量・重量のどれか1つあればOK）
- 希望日時（「明日」「来週」などの曖昧な表現でもOK）

## 質問ルール（厳守）
- **1ターンで質問できるのは1つだけ**
- 上記4項目のうち1つでも欠けている場合のみ質問する
- フォークリフトの有無は**聞かない**（なしと仮定してプランを立てる）
- 荷物の細かい寸法・正確な重量は**聞かない**（概算でプランを立てる）
- 既に答えた情報は絶対に再度聞かない

## 選択肢ボタン（必須）
質問する場合は必ず以下の形式で選択肢を出力すること：
<options>["選択肢A", "選択肢B", "選択肢C", "その他"]</options>

日時を聞く場合の選択肢例：
<options>["今日中", "明日", "今週中", "来週以降", "日程未定"]</options>

荷物サイズを聞く場合の選択肢例：
<options>["小型（100kg未満）", "中型（100〜500kg）", "大型（500kg以上）", "わからない"]</options>

## プラン提案フォーマット（情報が揃い次第、必ず出力）
提案の際は簡潔な説明文の後に以下のJSONを含めること：
<proposal>
{
  "vehicleType": "4tウイング",
  "deliveryMethod": "チャーター便",
  "pickupDatetime": "明日 9:00〜11:00",
  "deliveryDatetime": "翌日午前中",
  "estimatedPrice": 85000,
  "reason": "荷物量と距離を考慮した最適プランです。",
  "notes": "フォークリフトなしの場合は手積み対応となります。"
}
</proposal>

## 料金の目安（内部参照用）
- 軽貨物: 15,000〜25,000円
- 1tトラック: 25,000〜35,000円
- 2tトラック: 40,000〜55,000円
- 4tトラック: 70,000〜90,000円
- 10tトラック: 120,000〜150,000円
- 大型トラック: 180,000円〜
- 長距離（北海道・九州など）は1.5倍、緊急便は1.3倍`;

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
    { role: "system", content: SYSTEM_PROMPT },
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
      pickupDatetime: proposal.pickupDatetime,
      deliveryDeadline: proposal.deliveryDatetime,
      customerPrice: proposal.estimatedPrice?.toString(),
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
      pickupDatetime: proposal.pickupDatetime,
      deliveryDeadline: proposal.deliveryDatetime,
      customerPrice: proposal.estimatedPrice?.toString(),
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
