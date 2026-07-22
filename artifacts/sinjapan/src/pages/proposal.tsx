import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetShipment, useUpdateShipmentStatus, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Truck, Calendar, Box, CheckCircle, ArrowLeft, MapPin, Package, Info } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 grid grid-cols-3 gap-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium pt-0.5">
        {icon}{label}
      </div>
      <div className="col-span-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function formatDatetime(dt?: string | null) {
  if (!dt) return '未定';
  // "2026-07-24 09:00" → "2026年7月24日 09:00"
  return dt.replace(/^(\d{4})-(\d{2})-(\d{2})\s?/, (_, y, m, d) => `${y}年${Number(m)}月${Number(d)}日 `).trimEnd();
}

export default function Proposal() {
  const [, params] = useRoute('/proposal/:id');
  const shipmentId = Number(params?.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: shipment, isLoading } = useGetShipment(shipmentId, {
    query: { enabled: !!shipmentId, queryKey: getGetShipmentQueryKey(shipmentId) }
  });

  const updateStatus = useUpdateShipmentStatus();

  const handleApprove = async () => {
    await updateStatus.mutateAsync({ id: shipmentId, data: { status: '顧客承認' } });
    queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
    setLocation(`/shipment/${shipmentId}`);
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

  // Vehicle display
  const s = shipment as any;
  const vehicleLabel = [s.vehicleSize, s.vehicleBodyType].filter(Boolean).join(' ') || shipment.vehicleType || '未定';
  const truckCount = s.truckCount ?? 1;
  const deliveryType = s.deliveryType;
  const additionalWork = s.additionalWork;
  const highwayUse = s.highwayUse;

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
            {/* ルート */}
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

            {/* 荷物 */}
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

            {/* 車両・配送 */}
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

            {/* 備考 */}
            {shipment.notes && (
              <Row icon={<Info className="h-4 w-4 shrink-0" />} label="備考">
                <p className="text-muted-foreground whitespace-pre-wrap">{shipment.notes}</p>
              </Row>
            )}
          </div>

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
              onClick={handleApprove}
              disabled={updateStatus.isPending}
              className="flex-1 py-2.5 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {updateStatus.isPending ? '処理中…' : 'この内容で依頼する'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
