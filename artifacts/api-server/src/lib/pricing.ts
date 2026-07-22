/**
 * Chat LOGI — 料金計算エンジン
 *
 * 計算式:
 *   基本料（車格×距離帯） × ボディ割増 × 配送区分割引/割増
 *   + 付帯作業料
 *   + 高速代見込み
 *   = customerPrice（端数100円切り上げ）
 *
 *   carrierCost = customerPrice × 0.70（粗利率30%想定）
 *   grossProfit = customerPrice - carrierCost
 */

// ── 地域マスタ ──────────────────────────────────────────────────────────────

const PREFECTURE_REGION: Record<string, number> = {
  北海道: 0,
  青森: 1, 岩手: 1, 宮城: 1, 秋田: 1, 山形: 1, 福島: 1,
  茨城: 2, 栃木: 2, 群馬: 2, 埼玉: 2, 千葉: 2, 東京: 2, 神奈川: 2,
  新潟: 3, 富山: 3, 石川: 3, 福井: 3, 山梨: 3, 長野: 3, 岐阜: 3, 静岡: 3, 愛知: 3,
  三重: 4, 滋賀: 4, 京都: 4, 大阪: 4, 兵庫: 4, 奈良: 4, 和歌山: 4,
  鳥取: 5, 島根: 5, 岡山: 5, 広島: 5, 山口: 5,
  徳島: 6, 香川: 6, 愛媛: 6, 高知: 6,
  福岡: 7, 佐賀: 7, 長崎: 7, 熊本: 7, 大分: 7, 宮崎: 7, 鹿児島: 7,
  沖縄: 8,
};

// 地域間の概算距離 (km)
const REGION_DIST: number[][] = [
//  0    1    2    3    4    5    6    7    8
  [50,  500, 800, 900, 950, 1050, 1100, 1200, 1700], // 北海道
  [500,  50, 350, 450, 600, 750,  800,  900, 1600],  // 東北
  [800, 350,  50, 250, 500, 650,  700,  800, 1600],  // 関東
  [900, 450, 250,  50, 200, 400,  500,  700, 1500],  // 中部
  [950, 600, 500, 200,  50, 200,  300,  500, 1400],  // 近畿
  [1050,750, 650, 400, 200,  50,  150,  300, 1300],  // 中国
  [1100,800, 700, 500, 300, 150,   50,  200, 1200],  // 四国
  [1200,900, 800, 700, 500, 300,  200,   50, 1100],  // 九州
  [1700,1600,1600,1500,1400,1300,1200, 1100,  50],   // 沖縄
];

function estimateDistance(pickup: string, delivery: string): number {
  const r1 = inferRegion(pickup);
  const r2 = inferRegion(delivery);
  if (r1 === null || r2 === null) return 300; // デフォルト中距離
  return REGION_DIST[r1][r2];
}

function inferRegion(address: string): number | null {
  for (const [pref, region] of Object.entries(PREFECTURE_REGION)) {
    if (address.includes(pref)) return region;
  }
  return null;
}

// ── 距離帯 ────────────────────────────────────────────────────────────────

type DistanceTier = 'short' | 'mid' | 'long' | 'xlong';

function distanceTier(km: number): DistanceTier {
  if (km < 100) return 'short';
  if (km < 300) return 'mid';
  if (km < 600) return 'long';
  return 'xlong';
}

// ── Chat LOGIのマージン率 ──────────────────────────────────────────────────
// customerPrice = carrierCost ÷ (1 - MARGIN)
const MARGIN = 0.10;

// ── 庸車相場（円/台）車格 × 距離帯 ─────────────────────────────────────────
// ※ これは庸車への支払い目安。顧客価格はここに10%マージンを乗せて算出。

type VehicleSize = '軽貨物' | '1t' | '2t' | '4t' | '10t' | '大型';

const BASE_PRICE: Record<VehicleSize, Record<DistanceTier, number>> = {
  軽貨物: { short: 10000, mid: 16000, long: 22000, xlong: 32000 },
  '1t':   { short: 18000, mid: 26000, long: 36000, xlong: 50000 },
  '2t':   { short: 28000, mid: 40000, long: 55000, xlong: 75000 },
  '4t':   { short: 45000, mid: 62000, long: 75000, xlong: 105000 },
  '10t':  { short: 80000, mid: 105000, long: 140000, xlong: 190000 },
  大型:   { short: 120000, mid: 160000, long: 210000, xlong: 280000 },
};

// ── ボディタイプ割増率 ────────────────────────────────────────────────────

type BodyType = '平ボディ' | 'ウイング' | 'バン' | '冷凍冷蔵' | '幌';

const BODY_RATE: Record<BodyType, number> = {
  平ボディ:  1.00,
  ウイング:  1.10,
  バン:      1.05,
  冷凍冷蔵:  1.35,
  幌:        1.05,
};

// ── 付帯作業料（円/台）────────────────────────────────────────────────────

const ADDITIONAL_WORK_FEE: Record<string, number> = {
  手積み:     5000,
  手降ろし:   5000,
  ラッシング: 3000,
  養生:       5000,
  搬入:       5000,
  搬出:       5000,
};

function calcAdditionalWorkFee(additionalWork?: string | null): number {
  if (!additionalWork) return 0;
  let fee = 0;
  for (const [key, val] of Object.entries(ADDITIONAL_WORK_FEE)) {
    if (additionalWork.includes(key)) fee += val;
  }
  return fee;
}

// ── 高速代見込み（円）────────────────────────────────────────────────────

function estimateHighwayFee(km: number): number {
  if (km < 100) return 1500;
  if (km < 300) return 4000;
  if (km < 600) return 8000;
  return 14000;
}

// ── メイン計算関数 ────────────────────────────────────────────────────────

export interface PricingInput {
  vehicleSize: string;        // 軽貨物 / 1t / 2t / 4t / 10t / 大型
  vehicleBodyType: string;    // 平ボディ / ウイング / バン / 冷凍冷蔵 / 幌
  truckCount: number;         // 台数
  pickupAddress?: string | null;
  deliveryAddress?: string | null;
  deliveryType?: string | null;   // スポット / 定期
  additionalWork?: string | null; // 付帯作業テキスト
  highwayUse?: boolean | null;
  isUrgent?: boolean;             // 当日など緊急
}

export interface PricingResult {
  customerPrice: number;
  carrierCost: number;
  grossProfit: number;
  distanceKm: number;
  breakdown: {
    base: number;
    bodyMultiplier: number;
    deliveryMultiplier: number;
    additionalWork: number;
    highway: number;
    truckCount: number;
  };
}

export function calcPrice(input: PricingInput): PricingResult {
  const {
    vehicleSize,
    vehicleBodyType,
    truckCount,
    pickupAddress,
    deliveryAddress,
    deliveryType,
    additionalWork,
    highwayUse,
    isUrgent = false,
  } = input;

  // 距離
  const km = estimateDistance(pickupAddress ?? '', deliveryAddress ?? '');
  const tier = distanceTier(km);

  // 基本料（1台あたり）
  const sizeKey = (vehicleSize as VehicleSize) in BASE_PRICE
    ? (vehicleSize as VehicleSize)
    : '2t'; // フォールバック
  const basePerTruck = BASE_PRICE[sizeKey][tier];

  // ボディ割増
  const bodyRate = (vehicleBodyType as BodyType) in BODY_RATE
    ? BODY_RATE[vehicleBodyType as BodyType]
    : 1.0;

  // 配送区分割増/割引
  const deliveryRate = isUrgent
    ? 1.3
    : deliveryType === '定期' ? 0.85 : 1.0;

  // 付帯作業料（全台共通 × 台数）
  const additionalFeePerTruck = calcAdditionalWorkFee(additionalWork);

  // 高速代（台数分）
  const highwayFeePerTruck = highwayUse ? estimateHighwayFee(km) : 0;

  // 庸車コスト（1台あたり）= 庸車相場 × ボディ割増 × 配送区分 + 付帯作業 + 高速代
  const carrierPerTruck = Math.ceil(basePerTruck * bodyRate * deliveryRate / 100) * 100
    + additionalFeePerTruck
    + highwayFeePerTruck;

  // 庸車合計（台数分）
  const carrierCost = carrierPerTruck * truckCount;

  // 顧客価格 = 庸車コスト ÷ (1 - マージン率)、100円単位切り上げ
  const customerPrice = Math.ceil(carrierCost / (1 - MARGIN) / 100) * 100;
  const grossProfit = customerPrice - carrierCost;

  return {
    customerPrice,
    carrierCost,
    grossProfit,
    distanceKm: km,
    breakdown: {
      base: basePerTruck,
      bodyMultiplier: bodyRate,
      deliveryMultiplier: deliveryRate,
      additionalWork: additionalFeePerTruck,
      highway: highwayFeePerTruck,
      truckCount,
    },
  };
}
