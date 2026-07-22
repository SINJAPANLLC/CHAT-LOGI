import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetShipment, useUpdateShipmentStatus, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Truck, Calendar, Box, CheckCircle, ArrowLeft, MapPin, Package, Zap } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 grid grid-cols-3 gap-4 border-b border-border/40 last:border-0">
      <div className="flex items-start gap-2 text-sm text-muted-foreground font-medium pt-0.5">
        {icon}
        {label}
      </div>
      <div className="col-span-2 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function DateCell({ label, datetime, address }: { label: string; datetime?: string | null; address?: string | null }) {
  // Format "2026-07-24 09:00" → "2026年7月24日 09:00"
  const formatted = datetime
    ? datetime.replace(/^(\d{4})-(\d{2})-(\d{2})\s?/, '$1年$2月$3日 ').trimEnd()
    : '未定';

  return (
    <div>
      <span className="text-xs text-muted-foreground block mb-0.5">{label}</span>
      <p className="font-medium">{formatted}</p>
      {address && <p className="text-muted-foreground mt-0.5">{address}</p>}
    </div>
  );
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

  const handleModify = async () => {
    await updateStatus.mutateAsync({ id: shipmentId, data: { status: 'ヒアリング中' } });
    setLocation(`/chat/${shipmentId}`);
  };

  if (isLoading || !shipment) {
    return (
      <div className="flex-1 p-8 flex justify-center">
        <div className="w-full max-w-2xl space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  const price = shipment.customerPrice ? Number(shipment.customerPrice) : null;
  const formattedPrice = price
    ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price)
    : '未定';

  // Parse notes lines into structured fields
  const noteLines: Record<string, string> = {};
  (shipment.notes ?? '').split('\n').forEach(line => {
    const idx = line.indexOf(': ');
    if (idx !== -1) {
      noteLines[line.slice(0, idx)] = line.slice(idx + 2);
    }
  });
  const additionalWork = noteLines['付帯作業'];
  const highwayFee = noteLines['高速代'];
  const deliveryType = noteLines['配送区分'];
  const truckCount = noteLines['台数'];
  const extraNote = Object.entries(noteLines)
    .filter(([k]) => !['付帯作業','高速代','配送区分','台数'].includes(k))
    .map(([,v]) => v).join(' ') || null;

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

          {/* Header: price */}
          <div className="px-6 py-5 flex items-center justify-between bg-muted/30 border-b border-border">
            <div className="flex items-center gap-2 text-base font-semibold">
              <CheckCircle className="h-5 w-5" />
              Chat LOGI 推奨プラン
            </div>
            <div>
              <span className="text-2xl font-bold tracking-tight">{formattedPrice}</span>
              <span className="text-xs text-muted-foreground ml-1">（税別）</span>
            </div>
          </div>

          {/* Rows */}
          <div>

            {/* ルート */}
            <Row icon={<MapPin className="h-4 w-4 shrink-0" />} label="ルート">
              <div className="space-y-3">
                <DateCell label="集荷" datetime={shipment.pickupDatetime} address={shipment.pickupAddress} />
                <DateCell label="納品" datetime={shipment.deliveryDeadline} address={shipment.deliveryAddress} />
              </div>
            </Row>

            {/* 荷物 */}
            <Row icon={<Package className="h-4 w-4 shrink-0" />} label="荷物">
              <div className="space-y-0.5">
                {shipment.cargoType || shipment.cargoQuantity ? (
                  <>
                    {shipment.cargoType && <p className="font-medium">{shipment.cargoType}</p>}
                    {shipment.cargoQuantity && <p className="text-muted-foreground">{shipment.cargoQuantity}</p>}
                    {shipment.cargoWeight && <p className="text-muted-foreground">重量: {shipment.cargoWeight}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">未指定</p>
                )}
                {additionalWork && (
                  <p className="text-muted-foreground mt-1">付帯作業: {additionalWork}</p>
                )}
              </div>
            </Row>

            {/* 車両・配送 */}
            <Row icon={<Truck className="h-4 w-4 shrink-0" />} label="車両・配送">
              <div className="space-y-0.5">
                <p className="font-medium">
                  {[shipment.vehicleType, truckCount].filter(Boolean).join(' × ')}
                </p>
                <p className="text-muted-foreground">
                  {[deliveryType, shipment.deliveryMethod].filter(Boolean).join(' / ')}
                </p>
                {highwayFee && <p className="text-muted-foreground">高速代: {highwayFee}</p>}
              </div>
            </Row>

            {/* 備考 */}
            {extraNote && (
              <Row icon={<Zap className="h-4 w-4 shrink-0" />} label="備考">
                <p className="text-muted-foreground">{extraNote}</p>
              </Row>
            )}

          </div>

          {/* Footer buttons */}
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
