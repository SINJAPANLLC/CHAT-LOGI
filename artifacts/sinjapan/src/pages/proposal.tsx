import React, { useEffect, useRef, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetShipment, useUpdateShipmentStatus, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { customFetch } from '@workspace/api-client-react/custom-fetch';
import { Truck, Calendar, Box, CheckCircle, ArrowLeft, MapPin, Package, Info, CreditCard, ShieldCheck, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

declare const Square: any;

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5 grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium pt-0.5">
        {icon}{label}
      </div>
      <div className="col-span-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function formatDatetime(dt?: string | null) {
  if (!dt) return '未定';
  return dt.replace(/^(\d{4})-(\d{2})-(\d{2})\s?/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日 `).trimEnd();
}

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

  // Card registration state
  const [step, setStep] = useState<'proposal' | 'card'>('proposal');
  const [cardReady, setCardReady] = useState(false);
  const [cardError, setCardError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const cardRef = useRef<any>(null);
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // hasCard は常に false 扱い（毎回カード入力）
  const hasCard = false;

  // Initialize Square when entering card step
  useEffect(() => {
    if (step !== 'card') return;
    let card: any = null;
    let destroyed = false;

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
        cardRef.current = card;
        setCardReady(true);
      } catch (e: any) {
        if (!destroyed) setCardError(`初期化エラー: ${e.message}`);
      }
    };

    if (typeof Square !== 'undefined') {
      init();
    } else {
      const script = document.createElement('script');
      script.src = 'https://web.squarecdn.com/v1/square.js';
      script.onload = init;
      script.onerror = () => { if (!destroyed) setCardError('Square.js の読み込みに失敗しました'); };
      document.head.appendChild(script);
    }

    return () => {
      destroyed = true;
      card?.destroy?.();
      cardRef.current = null;
      setCardReady(false);
    };
  }, [step]);

  const handleApproveClick = () => {
    // 常にカード入力ステップへ
    setStep('card');
  };

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
      await customFetch('/api/square/authorize', {
        method: 'POST',
        body: JSON.stringify({ shipmentId, sourceId: result.token }),
      });
      toast({ title: '決済の与信確保が完了しました' });
      await doApprove();
    } catch (e: any) {
      setCardError(e.message);
    } finally {
      setRegistering(false);
    }
  };

  const handleModify = () => {
    sessionStorage.setItem(`modifying_${shipmentId}`, '1');
    updateStatus.mutate({ id: shipmentId, data: { status: 'ヒアリング中' } });
    setLocation(`/chat/${shipmentId}`);
  };

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
  const formattedPrice = price
    ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price)
    : '未定';

  const s = shipment as any;
  const vehicleLabel = [s.vehicleSize, s.vehicleBodyType].filter(Boolean).join(' ') || shipment.vehicleType || '未定';
  const truckCount = s.truckCount ?? 1;
  const deliveryType = s.deliveryType;
  const additionalWork = s.additionalWork;
  const highwayUse = s.highwayUse;

  // ── カード登録ステップ ──
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
              <ShieldCheck className="h-4 w-4" />
              カード情報
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

          {/* 請求予定 */}
          <div className="rounded-xl bg-muted/30 border border-border px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between text-muted-foreground">
              <span>配送費（税込）</span>
              <span>{price ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(Math.round(price * 1.1)) : '未定'}</span>
            </div>
          </div>

          {cardError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">{cardError}</div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => setStep('proposal')}
              className="px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors"
            >
              戻る
            </button>
            <button
              onClick={handleCardRegister}
              disabled={registering || !cardReady}
              className="flex-1 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {registering ? <><Loader2 className="h-4 w-4 animate-spin" />処理中…</> : 'カードで支払い・依頼する'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── 提案確認ステップ ──
  return (
    <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl">

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">ご提案内容</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            ヒアリング内容に基づく配送プランです。内容をご確認ください。
          </p>
        </div>

        <div className="rounded-2xl border border-border overflow-hidden shadow-sm">

          {/* Header */}
          <div className="px-6 py-5 flex items-center justify-between bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 font-semibold">
              <CheckCircle className="h-5 w-5" />
              Chat LOGI 推奨プラン
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tracking-tight">{formattedPrice}</div>
              <div className="text-xs text-muted-foreground">税別</div>
            </div>
          </div>

          <div>
            <Row icon={<MapPin className="h-4 w-4 shrink-0" />} label="ルート">
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">集荷</span>
                  <p className="font-medium">{formatDatetime(shipment.pickupDatetime)}</p>
                  {shipment.pickupAddress && <p className="text-muted-foreground mt-0.5">{shipment.pickupAddress}</p>}
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-0.5">納品</span>
                  <p className="font-medium">{formatDatetime(shipment.deliveryDeadline)}</p>
                  {shipment.deliveryAddress && <p className="text-muted-foreground mt-0.5">{shipment.deliveryAddress}</p>}
                </div>
              </div>
            </Row>

            <Row icon={<Package className="h-4 w-4 shrink-0" />} label="荷物">
              <div className="space-y-0.5">
                {shipment.cargoType && <p className="font-medium">{shipment.cargoType}</p>}
                {shipment.cargoQuantity && <p className="text-muted-foreground">{shipment.cargoQuantity}</p>}
                {!shipment.cargoType && !shipment.cargoQuantity && <p className="text-muted-foreground">未指定</p>}
                {additionalWork && additionalWork !== '不要' && (
                  <p className="text-muted-foreground mt-1">付帯作業：{additionalWork}</p>
                )}
              </div>
            </Row>

            <Row icon={<Truck className="h-4 w-4 shrink-0" />} label="車両・配送">
              <div className="space-y-0.5">
                <p className="font-medium">
                  {vehicleLabel}
                  {truckCount > 1 && ` × ${truckCount}台`}
                </p>
                <p className="text-muted-foreground">
                  {[deliveryType, shipment.deliveryMethod].filter(Boolean).join(' / ')}
                </p>
                {highwayUse && (
                  <p className="text-muted-foreground">高速代：{highwayUse}（実費別途）</p>
                )}
              </div>
            </Row>

            {shipment.notes && (
              <Row icon={<Info className="h-4 w-4 shrink-0" />} label="備考">
                <p className="text-muted-foreground whitespace-pre-wrap">{shipment.notes}</p>
              </Row>
            )}
          </div>

          {/* カード登録案内 */}
          {hasCard === false && (
            <div className="px-6 py-3 bg-black border-t border-black text-xs text-white space-y-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-3.5 w-3.5 shrink-0" />
                依頼確定後にお支払いカードの登録が必要です
              </div>
              <div className="pl-5">
                <a href="/admin/invoices" className="underline underline-offset-2 text-white/70 hover:text-white transition-colors">
                  法人請求書払い申請はこちら →
                </a>
              </div>
            </div>
          )}
          {hasCard === true && (
            <div className="px-6 py-3 bg-black border-t border-black flex items-center gap-2 text-xs text-white">
              <CreditCard className="h-3.5 w-3.5 shrink-0" />
              登録済みカードで決済されます
            </div>
          )}

          {/* Buttons */}
          <div className="px-6 py-5 border-t border-border flex flex-col sm:flex-row gap-3 bg-muted/10">
            <button
              onClick={handleModify}
              disabled={updateStatus.isPending}
              className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-border text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              条件を変更する
            </button>
            <button
              onClick={handleApproveClick}
              disabled={updateStatus.isPending || hasCard === null}
              className="flex-1 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {updateStatus.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />処理中…</> : hasCard ? 'この内容で依頼する' : 'この内容で依頼する（カード登録へ）'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
