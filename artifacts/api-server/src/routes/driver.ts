/**
 * /api/driver/:token  — 認証不要のドライバー/運送会社向けAPI
 */
import { Router, type IRouter } from "express";
import { db, shipmentsTable, carriersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

const router: IRouter = Router();

function formatShipment(s: any, carrier?: any) {
  return {
    id: s.id,
    token: s.driverToken,
    status: s.status,
    pickupAddress: s.pickupAddress,
    pickupDatetime: s.pickupDatetime,
    deliveryAddress: s.deliveryAddress,
    deliveryDeadline: s.deliveryDeadline,
    cargoType: s.cargoType,
    cargoQuantity: s.cargoQuantity,
    cargoWeight: s.cargoWeight,
    cargoSize: s.cargoSize,
    vehicleType: s.vehicleType,
    vehicleSize: (s as any).vehicleSize,
    vehicleBodyType: (s as any).vehicleBodyType,
    deliveryType: (s as any).deliveryType,
    additionalWork: (s as any).additionalWork,
    highwayUse: (s as any).highwayUse,
    notes: s.notes,
    assignedDriverName: s.assignedDriverName,
    driverCarrierName: (s as any).driverCarrierName,
    driverPhone: (s as any).driverPhone,
    driverVehicleNumber: (s as any).driverVehicleNumber,
    driverLat: (s as any).driverLat ? Number((s as any).driverLat) : null,
    driverLng: (s as any).driverLng ? Number((s as any).driverLng) : null,
    driverLocationUpdatedAt: (s as any).driverLocationUpdatedAt instanceof Date
      ? (s as any).driverLocationUpdatedAt.toISOString()
      : (s as any).driverLocationUpdatedAt,
    carrier: carrier ? { companyName: carrier.companyName, phone: carrier.phone } : null,
  };
}

async function findByToken(token: string) {
  const [shipment] = await db
    .select()
    .from(shipmentsTable)
    .where(eq((shipmentsTable as any).driverToken, token))
    .limit(1);
  return shipment ?? null;
}

// GET /api/driver/:token — 指示書 + ドライバー情報取得
router.get("/driver/:token", async (req, res): Promise<void> => {
  const shipment = await findByToken(req.params.token);
  if (!shipment) { res.status(404).json({ error: "指示書が見つかりません" }); return; }

  const carrier = (shipment as any).assignedCarrierId
    ? (await db.select().from(carriersTable).where(eq(carriersTable.id, (shipment as any).assignedCarrierId)).limit(1))[0]
    : null;

  res.json(formatShipment(shipment, carrier));
});

// POST /api/driver/generate/:shipmentId — トークン生成（管理者側から呼ぶ）
router.post("/driver/generate/:shipmentId", async (req, res): Promise<void> => {
  const id = parseInt(req.params.shipmentId, 10);
  const [existing] = await db.select({ token: (shipmentsTable as any).driverToken }).from(shipmentsTable).where(eq(shipmentsTable.id, id));
  if (!existing) { res.status(404).json({ error: "案件が見つかりません" }); return; }

  // すでにトークンがあればそれを返す
  if ((existing as any).token) { res.json({ token: (existing as any).token }); return; }

  const token = randomUUID();
  await db.update(shipmentsTable).set({ driverToken: token } as any).where(eq(shipmentsTable.id, id));
  res.json({ token });
});

// PATCH /api/driver/:token/info — ドライバー情報更新
router.patch("/driver/:token/info", async (req, res): Promise<void> => {
  const shipment = await findByToken(req.params.token);
  if (!shipment) { res.status(404).json({ error: "指示書が見つかりません" }); return; }

  const { driverName, driverCarrierName, driverPhone, driverVehicleNumber } = req.body;
  const updates: any = {};
  if (driverName !== undefined) updates.assignedDriverName = driverName;
  if (driverCarrierName !== undefined) updates.driverCarrierName = driverCarrierName;
  if (driverPhone !== undefined) updates.driverPhone = driverPhone;
  if (driverVehicleNumber !== undefined) updates.driverVehicleNumber = driverVehicleNumber;

  if (Object.keys(updates).length > 0) {
    await db.update(shipmentsTable).set(updates).where(eq(shipmentsTable.id, shipment.id));
  }
  res.json({ ok: true });
});

// PATCH /api/driver/:token/status — ステータス変更
const ALLOWED = ['集荷完了', '配送中', '納品完了'];
router.patch("/driver/:token/status", async (req, res): Promise<void> => {
  const shipment = await findByToken(req.params.token);
  if (!shipment) { res.status(404).json({ error: "指示書が見つかりません" }); return; }

  const { status } = req.body;
  if (!ALLOWED.includes(status)) { res.status(400).json({ error: "無効なステータス" }); return; }

  await db.update(shipmentsTable).set({ status } as any).where(eq(shipmentsTable.id, shipment.id));
  res.json({ ok: true });
});

// POST /api/driver/:token/location — GPS位置更新
router.post("/driver/:token/location", async (req, res): Promise<void> => {
  const shipment = await findByToken(req.params.token);
  if (!shipment) { res.status(404).json({ error: "指示書が見つかりません" }); return; }

  const { lat, lng } = req.body;
  if (typeof lat !== "number" || typeof lng !== "number") {
    res.status(400).json({ error: "lat/lng が必要です" }); return;
  }

  await db.update(shipmentsTable).set({
    driverLat: String(lat),
    driverLng: String(lng),
    driverLocationUpdatedAt: new Date(),
  } as any).where(eq(shipmentsTable.id, shipment.id));

  res.json({ ok: true });
});

export default router;
