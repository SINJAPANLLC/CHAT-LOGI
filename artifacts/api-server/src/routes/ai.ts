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

const SYSTEM_PROMPT = `あなたはSINJAPAN（シンジャパン）の物流AIアシスタントです。
日本語で丁寧かつ簡潔に応答してください。

あなたの役割：
- 荷主（配送を依頼したいお客様）から配送の依頼内容をヒアリングする
- 必要な情報を自然な会話形式で収集する
- 情報が揃ったら最適な配送プランを提案する

ヒアリングが必要な情報（優先順）：
1. 集荷先の住所（都道府県・市区町村レベルでOK）
2. 納品先の住所（都道府県・市区町村レベルでOK）
3. 荷物の種類（例：機械部品、食品、家電など）
4. 荷物の数量・重量（例：パレット8枚、約2800kg）
5. ご希望の集荷日時
6. 納品期限（あれば）
7. 集荷先・納品先にフォークリフトはあるか（大型荷物の場合）

ヒアリングのルール：
- 一度に1〜2個の質問に留める（多すぎると煩わしい）
- お客様が既に答えた情報は再度聞かない
- 情報が揃ったら、以下のJSON形式でプランを提案する：

提案フォーマット（情報が全て揃ったら必ず以下のJSON形式を含めること）：
<proposal>
{
  "vehicleType": "4tウイング",
  "deliveryMethod": "チャーター便",
  "pickupDatetime": "明日 9:00〜11:00",
  "deliveryDatetime": "翌日午前中",
  "estimatedPrice": 85000,
  "reason": "荷物の重量と距離を考慮し、4tウイングのチャーター便が最適です。",
  "notes": "フォークリフトが両拠点にあるため、積み降ろしはスムーズに行えます。"
}
</proposal>

提案後は「この内容でよろしいですか？」と確認する。

料金の目安（参考）：
- 軽貨物: 15,000〜25,000円
- 1tトラック: 25,000〜35,000円
- 2tトラック: 40,000〜55,000円
- 4tトラック: 70,000〜90,000円
- 10tトラック: 120,000〜150,000円
- 大型トラック: 180,000円〜
- 長距離（北海道・九州など）は上記の1.5倍程度
- 緊急便は上記の1.3倍程度`;

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
  // Strip the <proposal> tag from the visible message
  const visibleMessage = aiMessage.replace(/<proposal>[\s\S]*?<\/proposal>/g, "").trim();

  // Save AI response
  await db.insert(conversationsTable).values({
    shipmentId: shipment.id,
    sender: "ai",
    message: visibleMessage,
    structuredData: proposal ? JSON.stringify(proposal) : null,
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
    extractedData: "{}",
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
  const visibleMessage = aiMessage.replace(/<proposal>[\s\S]*?<\/proposal>/g, "").trim();

  // Save AI response
  await db.insert(conversationsTable).values({
    shipmentId: id,
    sender: "ai",
    message: visibleMessage,
    structuredData: proposal ? JSON.stringify(proposal) : null,
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
    extractedData: "{}",
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
