import React, { useEffect, useRef, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetShipment, useUpdateShipmentStatus, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react/custom-fetch';
import {
  Truck, Calendar, Box, CheckCircle, ArrowLeft, MapPin, Package,
  Info, CreditCard, ShieldCheck, Loader2, Pencil, X, Save, MessageSquare,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

declare const Square: any;

const VEHICLE_SIZES = ['軽貨物', '1t', '2t', '4t', '10t', '大型'];
const BODY_TYPES = ['平ボディ', 'ウイング', 'バン', '冷凍冷蔵', '幌'];

function formatDatetime(dt?: string | null) {
  if (!dt) return '未定';
  return dt.replace(/^(\d{4})-(\d{2})-(\d{2})\s?/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日 `).trimEnd();
}

function fmt(n?: number | null) {
  if (!n) return null;
  return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);
}

// ── Row component ─────────────────────────────────────────────────────────────
function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium pt-0.5">{icon}{label}</div>
      <div className="col-span-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

// ── Inline input helpers ──────────────────────────────────────────────────────
function TextInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
    />
  );
}
function SelectInput({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="rounded-lg border border-border px-3 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
function NumberInput({ value, onChange, prefix }: { value: number; onChange: (v: number) => void; prefix?: string }) {
  return (
    <div className="relative inline-flex items-center">
      {prefix && <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none">{prefix}</span>}
      <input
        type="number"
        value={value || ''}
        onChange={e => onChange(Number(e.target.value))}
        className={`w-40 rounded-lg border border-border py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 ${prefix ? 'pl-7 pr-3' : 'px-3'}`}
      />
    </div>
  );
}

// ── Edit state type ───────────────────────────────────────────────────────────
type EditData = {
  pickupDatetime: string;
  deliveryDeadline: string;
  cargoType: string;
  cargoQuantity: string;
  additionalWork: string;
  vehicleSize: string;
  vehicleBodyType: string;
  truckCount: number;
  deliveryType: string;
  highwayUse: string;
  notes: string;
  desiredPrice: number;
};

// ── Main component ────────────────────────────────────────────────────────────
export default function Proposal() {
  const [, params] = useRoute('/proposal/:id');
  const shipmentId = Number(params?.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: shipment, isLoading } = useGetShipment(shipmentId, {
    query: { enabled: !!shipmentId, queryKey: getGetShipmentQueryKey(shipmentId) }
  });

  const updateStatus = useUpdateShipmentStatus();

  // Card / payment state
  const [step, setStep] = useState<'proposal' | 'card'>('proposal');
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const cardRef = useRef<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const hasCard = false;

  // Invoice approval
  const [invoiceApproved, setInvoiceApproved] = useState(false);
  useEffect(() => {
    customFetch<any>('/api/corporate/status')
      .then(s => { if (s?.creditStatus === 'approved') setInvoiceApproved(true); })
      .catch(() => {});
  }, []);

  // ── Edit mode state ─────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<EditData>({
    pickupDatetime: '', deliveryDeadline: '', cargoType: '', cargoQuantity: '',
    additionalWork: '', vehicleSize: '2t', vehicleBodyType: '平ボディ',
    truckCount: 1, deliveryType: 'スポット', highwayUse: 'あり', notes: '', desiredPrice: 0,
  });

  const s = shipment as any;

  const startEdit = () => {
    setEditData({
      pickupDatetime:   s?.pickupDatetime  ?? '',
      deliveryDeadline: s?.deliveryDeadline ?? '',
      cargoType:        s?.cargoType        ?? '',
      cargoQuantity:    s?.cargoQuantity    ?? '',
      additionalWork:   s?.additionalWork   ?? '',
      vehicleSize:      s?.vehicleSize      ?? '2t',
      vehicleBodyType:  s?.vehicleBodyType  ?? '平ボディ',
      truckCount:       s?.truckCount       ?? 1,
      deliveryType:     s?.deliveryType     ?? 'スポット',
      highwayUse:       s?.highwayUse       ?? 'あり',
      notes:            s?.notes            ?? '',
      desiredPrice:     s?.desiredPrice     ?? 0,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: any = {
        ...editData,
        vehicleType: `${editData.vehicleSize}${editData.vehicleBodyType}`,
        deliveryMethod: editData.deliveryType === '定期' ? '定期チャーター' : 'スポットチャーター',
      };
      if (!body.desiredPrice) delete body.desiredPrice;
      await customFetch(`/api/shipments/${shipmentId}`, { method: 'PATCH', body: JSON.stringify(body) });
      queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
      toast({ title: '内容を更新しました' });
      setIsEditing(false);
    } catch (e: any) {
      toast({ title: '保存に失敗しました', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const set = <K extends keyof EditData>(k: K, v: EditData[K]) =>
    setEditData(prev => ({ ...prev, [k]: v }));

  // ── Square init ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (step !== 'card') return;
    let card: any = null; let destroyed = false;
    const init = async () => {
      try {
        const config = await customFetch<any>('/api/config/payment');
        if (!config.squareApplicationId) { setCardError('Square設定が不足しています'); return; }
        const payments = Square.payments(config.squareApplicationId, config.squareLocationId);
        card = await payments.card({
          style: {
            input: { fontSize: '14px' },
            '.input-container': { borderColor: '#e2e8f0', borderRadius: '8px' },
            '.input-container.is-focus': { borderColor: '#1a202c' },
          },
        });
        if (destroyed) return;
        if (cardContainerRef.current) await card.attach(cardContainerRef.current);
        cardRef.current = card; setCardReady(true);
      } catch (e: any) { if (!destroyed) setCardError(`初期化エラー: ${e.message}`); }
    };
    if (typeof Square !== 'undefined') { init(); }
    else {
      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.onload = init;
      script.onerror = () => { if (!destroyed) setCardError('Square.js の読み込みに失敗しました'); };
      document.head.appendChild(script);
    }
    return () => { destroyed = true; card?.destroy?.(); cardRef.current = null; setCardReady(false); };
  }, [step]);

  const handleApproveClick = () => setStep('card');

  const doApprove = async () => {
    await updateStatus.mutateAsync({ id: shipmentId, data: { status: '顧客承認' } });
    queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
    setLocation(`/shipment/${shipmentId}`);
  };

  const handleCardRegister = async () => {
    if (!cardRef.current) return;
    setRegistering(true); setCardError(null);
    try {
      const result = await cardRef.current.tokenize();
      if (result.status !== 'OK') throw new Error(result.errors?.[0]?.message ?? 'カードの読み取りに失敗しました');
      await customFetch('/api/square/authorize', { method: 'POST', body: JSON.stringify({ shipmentId, sourceId: result.token }) });
      toast({ title: '決済の与信確保が完了しました' });
      await doApprove();
    } catch (e: any) { setCardError(e.message); }
    finally { setRegistering(false); }
  };

  const handleModify = () => {
    sessionStorage.setItem(`modifying_${shipmentId}`, '1');
    updateStatus.mutate({ id: shipmentId, data: { status: 'ヒアリング中' } });
    setLocation(`/chat/${shipmentId}`);
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading || !shipment) {
    return (
      <div className="flex-1 p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-72 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const price = shipment.customerPrice ? Number(shipment.customerPrice) : null;
  const formattedPrice = price ? fmt(price) : '未定';
  const vehicleLabel = [s.vehicleSize, s.vehicleBodyType].filter(Boolean).join(' ') || shipment.vehicleType || '未定';
  const truckCount = s.truckCount ?? 1;

  // ── Card step ─────────────────────────────────────────────────────────────
  if (step === 'card') {
    return (
      <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
        <div className="w-full max-w-xl space-y-6 animate-in fade-in duration-300">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">お支払いカードの登録</h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              依頼送信時に与信確認（オーソリ）を行います。実際のお引き落としは納品完了後です。<br />
              なお、配車のご手配が確定するまでには時間をいただく場合があり、配車をお約束するものではありません。
            </p>
          </div>
          <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
            <div className="px-5 py-4 bg-muted/30 border-b border-border/50 text-sm font-semibold flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />カード情報
            </div>
            <div className="p-5 space-y-4">
              <div ref={cardContainerRef} id="card-container-proposal" className="min-h-[100px]" />
              {!cardReady && !cardError && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />フォームを読み込み中…
                </div>
              )}
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />
                カード情報はSquareが直接処理します。当社サーバーには保存されません。
              </p>
            </div>
          </div>
          <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>配送費（税込）</span>
              <span>{price ? fmt(Math.round(price * 1.1)) : '未定'}</span>
            </div>
          </div>
          {cardError && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{cardError}</div>}
          <div className="flex gap-3">
            <button onClick={() => setStep('proposal')} className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors">戻る</button>
            <button onClick={handleCardRegister} disabled={registering || !cardReady}
              className="flex-1 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {registering ? <><Loader2 className="h-4 w-4 animate-spin" />処理中…</> : 'カードで支払い・依頼する'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Proposal step ──────────────────────────────────────────────────────────
  return (
    <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl">

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">ご提案内容</h1>
            <p className="text-muted-foreground mt-1 text-sm">ヒアリング内容に基づく配送プランです。内容をご確認ください。</p>
          </div>
          {!isEditing ? (
            <button onClick={startEdit} className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors">
              <Pencil className="h-3.5 w-3.5" />内容を編集
            </button>
          ) : (
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setIsEditing(false)} className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors">
                <X className="h-3.5 w-3.5" />キャンセル
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}保存
              </button>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border overflow-hidden shadow-sm">

          {/* ── Header: 価格 ── */}
          <div className="px-6 py-5 flex items-center justify-between bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle className="h-5 w-5" />Chat LOGI 推奨プラン
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight">{formattedPrice}</div>
              <div className="text-xs text-muted-foreground">税別</div>
            </div>
          </div>

          <div>
            {/* ── ルート（住所は固定・日時は編集可） ── */}
            <Row icon={<MapPin className="h-4 w-4 shrink-0" />} label="ルート">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">集荷</span>
                  {isEditing
                    ? <TextInput value={editData.pickupDatetime} onChange={v => set('pickupDatetime', v)} placeholder="例: 2026-08-10 10:00" />
                    : <p className="font-medium">{formatDatetime(shipment.pickupDatetime)}</p>}
                  {shipment.pickupAddress && <p className="text-muted-foreground mt-0.5 text-xs">{shipment.pickupAddress}</p>}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">納品</span>
                  {isEditing
                    ? <TextInput value={editData.deliveryDeadline} onChange={v => set('deliveryDeadline', v)} placeholder="例: 2026-08-10 17:00" />
                    : <p className="font-medium">{formatDatetime(shipment.deliveryDeadline)}</p>}
                  {shipment.deliveryAddress && <p className="text-muted-foreground mt-0.5 text-xs">{shipment.deliveryAddress}</p>}
                </div>
              </div>
            </Row>

            {/* ── 荷物 ── */}
            <Row icon={<Package className="h-4 w-4 shrink-0" />} label="荷物">
              {isEditing ? (
                <div className="space-y-2">
                  <TextInput value={editData.cargoType} onChange={v => set('cargoType', v)} placeholder="荷物の種類（例: 精密機器、食品、家具）" />
                  <TextInput value={editData.cargoQuantity} onChange={v => set('cargoQuantity', v)} placeholder="物量・荷姿（例: パレット10枚、段ボール50箱）" />
                  <TextInput value={editData.additionalWork} onChange={v => set('additionalWork', v)} placeholder="付帯作業（例: 手積み・手降ろし、不要）" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  {s.cargoType && <p className="font-medium">{s.cargoType}</p>}
                  {s.cargoQuantity && <p className="text-muted-foreground">{s.cargoQuantity}</p>}
                  {!s.cargoType && !s.cargoQuantity && <p className="text-muted-foreground">未指定</p>}
                  {s.additionalWork && s.additionalWork !== '不要' && (
                    <p className="text-muted-foreground mt-1">付帯作業：{s.additionalWork}</p>
                  )}
                </div>
              )}
            </Row>

            {/* ── 車両・配送 ── */}
            <Row icon={<Truck className="h-4 w-4 shrink-0" />} label="車両・配送">
              {isEditing ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <SelectInput value={editData.vehicleSize} onChange={v => set('vehicleSize', v)} options={VEHICLE_SIZES} />
                    <SelectInput value={editData.vehicleBodyType} onChange={v => set('vehicleBodyType', v)} options={BODY_TYPES} />
                  </div>
                  <div className="flex flex-wrap gap-3 items-center">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground shrink-0">台数</span>
                      <NumberInput value={editData.truckCount} onChange={v => set('truckCount', Math.max(1, v))} />
                      <span className="text-muted-foreground">台</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <SelectInput value={editData.deliveryType} onChange={v => set('deliveryType', v)} options={['スポット', '定期']} />
                    <SelectInput value={editData.highwayUse} onChange={v => set('highwayUse', v)} options={['あり', 'なし']} />
                  </div>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <p className="font-medium">{vehicleLabel}{truckCount > 1 ? ` × ${truckCount}台` : ''}</p>
                  <p className="text-muted-foreground">
                    {[s.deliveryType, shipment.deliveryMethod].filter(Boolean).join(' / ')}
                  </p>
                  {s.highwayUse && <p className="text-muted-foreground">高速代：{s.highwayUse}（実費別途）</p>}
                </div>
              )}
            </Row>

            {/* ── 備考 ── */}
            <Row icon={<Info className="h-4 w-4 shrink-0" />} label="備考">
              {isEditing ? (
                <textarea
                  value={editData.notes}
                  onChange={e => set('notes', e.target.value)}
                  rows={3}
                  placeholder="時間指定・入構証・フロア指定など"
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-foreground/20 resize-y"
                />
              ) : (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {shipment.notes || <span className="italic text-muted-foreground/60">なし</span>}
                </p>
              )}
            </Row>

            {/* ── 希望金額 ── */}
            <Row icon={<MessageSquare className="h-4 w-4 shrink-0" />} label="ご希望金額（参考）">
              {isEditing ? (
                <div className="space-y-1">
                  <NumberInput value={editData.desiredPrice} onChange={v => set('desiredPrice', v)} prefix="¥" />
                  <p className="text-xs text-muted-foreground">ご予算感を教えていただくと、最適なプランをご提案しやすくなります</p>
                </div>
              ) : (
                <div>
                  {s.desiredPrice
                    ? <p className="font-medium">{fmt(s.desiredPrice)}<span className="text-xs text-muted-foreground ml-2">（お客様ご希望）</span></p>
                    : <p className="text-muted-foreground text-xs italic">未入力 — 「内容を編集」から入力できます</p>}
                </div>
              )}
            </Row>
          </div>

          {/* ── 支払い案内 ── */}
          {invoiceApproved ? (
            <div className="px-6 py-3 bg-black border-t border-black flex items-center gap-2 text-xs text-white">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-green-400" />法人請求書払いが利用可能です
            </div>
          ) : (
            <div className="px-6 py-3 bg-black border-t border-black text-xs text-white space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 shrink-0" />依頼確定後にお支払いカードの登録が必要です
              </div>
              <div className="pl-5">
                <a href="/invoices" className="underline underline-offset-2 text-white/70 hover:text-white transition-colors">
                  法人請求書払い申請はこちら →
                </a>
              </div>
            </div>
          )}

          {/* ── Buttons ── */}
          {!isEditing && (
            <div className="px-6 py-5 border-t border-border flex flex-col sm:flex-row gap-3 bg-muted/10">
              <button
                onClick={handleModify}
                disabled={updateStatus.isPending}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />条件を変更する
              </button>
              <button
                onClick={handleApproveClick}
                disabled={updateStatus.isPending || hasCard === null}
                className="flex-1 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {updateStatus.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />処理中…</>
                  : invoiceApproved || hasCard ? 'この内容で依頼する' : 'この内容で依頼する（カード登録へ）'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
