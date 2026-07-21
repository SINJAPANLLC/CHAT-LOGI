import { Router, type IRouter } from "express";
import { db, shipmentsTable, conversationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { StartAiChatBody, SendMessageBody } from "@workspace/api-zod";
import { requireAuth } from "../middlewares/auth";
import {
  processAiMessage,
  extractShipmentInfo,
  type ExtractedData,
} from "../lib/ai";

const router: IRouter = Router();

function parseId(raw: string | string[]): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  return parseInt(s, 10);
}

// Start a new AI consultation
router.post("/ai/start", requireAuth, async (req, res): Promise<void> => {
  const parsed = StartAiChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { message } = parsed.data;

  // Extract initial data
  const extracted = extractShipmentInfo(message);

  // Create shipment record
  const [shipment] = await db
    .insert(shipmentsTable)
    .values({
      userId: req.session.userId,
      requestText: message,
      status: "ヒアリング中",
      pickupAddress: extracted.pickupAddress || null,
      deliveryAddress: extracted.deliveryAddress || null,
      cargoType: extracted.cargoType || null,
      cargoQuantity: extracted.cargoQuantity || null,
      cargoWeight: extracted.cargoWeight || null,
      pickupDatetime: extracted.pickupDatetime || null,
    })
    .returning();

  // Save user message
  await db.insert(conversationsTable).values({
    shipmentId: shipment.id,
    sender: "user",
    message,
    structuredData: JSON.stringify(extracted),
  });

  // Process AI response
  const aiResult = processAiMessage(message, {}, [message]);

  // Save AI response
  await db.insert(conversationsTable).values({
    shipmentId: shipment.id,
    sender: "ai",
    message: aiResult.question,
    structuredData: JSON.stringify(aiResult.extractedData),
  });

  // Update shipment status if complete
  if (aiResult.isComplete && aiResult.proposal) {
    await db.update(shipmentsTable).set({
      status: "見積提示",
      vehicleType: aiResult.proposal.vehicleType,
      deliveryMethod: aiResult.proposal.deliveryMethod,
      pickupDatetime: aiResult.proposal.pickupDatetime,
      deliveryDeadline: aiResult.proposal.deliveryDatetime,
      customerPrice: aiResult.proposal.estimatedPrice.toString(),
      updatedAt: new Date(),
    }).where(eq(shipmentsTable.id, shipment.id));
  }

  res.json({
    message: aiResult.question,
    shipmentId: shipment.id,
    isComplete: aiResult.isComplete,
    proposal: aiResult.proposal || null,
    extractedData: JSON.stringify(aiResult.extractedData),
  });
});

// Send message in existing conversation
router.post("/shipments/:id/conversations", requireAuth, async (req, res): Promise<void> => {
  const id = parseId(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "無効なID" }); return; }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Load conversation history
  const history = await db
    .select()
    .from(conversationsTable)
    .where(eq(conversationsTable.shipmentId, id))
    .orderBy(conversationsTable.createdAt);

  // Load current shipment
  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq(shipmentsTable.id, id))
    .limit(1);

  if (!shipment) { res.status(404).json({ error: "案件が見つかりません" }); return; }

  // Rebuild extracted data from shipment
  const existingData: ExtractedData = {
    cargoType: shipment.cargoType || undefined,
    cargoQuantity: shipment.cargoQuantity || undefined,
    cargoWeight: shipment.cargoWeight || undefined,
    cargoSize: shipment.cargoSize || undefined,
    pickupAddress: shipment.pickupAddress || undefined,
    deliveryAddress: shipment.deliveryAddress || undefined,
    pickupDatetime: shipment.pickupDatetime || undefined,
    deliveryDeadline: shipment.deliveryDeadline || undefined,
  };

  const { message } = parsed.data;
  const historyTexts = history.map(h => h.message);

  // Save user message
  const updatedData = extractShipmentInfo(message, existingData);
  await db.insert(conversationsTable).values({
    shipmentId: id,
    sender: "user",
    message,
    structuredData: JSON.stringify(updatedData),
  });

  // Process AI
  const aiResult = processAiMessage(message, existingData, historyTexts);

  // Save AI response
  await db.insert(conversationsTable).values({
    shipmentId: id,
    sender: "ai",
    message: aiResult.question,
    structuredData: JSON.stringify(aiResult.extractedData),
  });

  // Update shipment with extracted data
  const updateData: any = {
    pickupAddress: aiResult.extractedData.pickupAddress || shipment.pickupAddress,
    deliveryAddress: aiResult.extractedData.deliveryAddress || shipment.deliveryAddress,
    cargoType: aiResult.extractedData.cargoType || shipment.cargoType,
    cargoQuantity: aiResult.extractedData.cargoQuantity || shipment.cargoQuantity,
    cargoWeight: aiResult.extractedData.cargoWeight || shipment.cargoWeight,
    pickupDatetime: aiResult.extractedData.pickupDatetime || shipment.pickupDatetime,
    updatedAt: new Date(),
  };

  if (aiResult.isComplete && aiResult.proposal) {
    updateData.status = "見積提示";
    updateData.vehicleType = aiResult.proposal.vehicleType;
    updateData.deliveryMethod = aiResult.proposal.deliveryMethod;
    updateData.customerPrice = aiResult.proposal.estimatedPrice.toString();
    updateData.deliveryDeadline = aiResult.proposal.deliveryDatetime;
  }

  await db.update(shipmentsTable).set(updateData).where(eq(shipmentsTable.id, id));

  res.json({
    message: aiResult.question,
    shipmentId: id,
    isComplete: aiResult.isComplete,
    proposal: aiResult.proposal || null,
    extractedData: JSON.stringify(aiResult.extractedData),
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
