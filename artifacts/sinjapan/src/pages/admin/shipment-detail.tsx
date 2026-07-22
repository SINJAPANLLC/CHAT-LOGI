import React, { useState, useEffect } from 'react';
import { useRoute } from 'wouter';
import {
  useGetShipment, useUpdateShipment, useUpdateShipmentStatus,
  useListCarriers, getGetShipmentQueryKey,
  useListConversations, getListConversationsQueryKey
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save, Pencil, Bot, User, FileText, Send, X, MapPin, Navigation } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

const fmt = (n: number | string | null | undefined) =>
  n ? new Intl.NumberFormat('ja-JP').format(Number(n)) : '—';

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-3 border-b border-border/40 last:border-0 gap-4">
      <span className="text-sm text-muted-foreground shrink-0 w-32">{label}</span>
      <span className="text-sm font-medium text-right">{value || '—'}</span>
    </div>
  );
}

interface SectionProps {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}
function Section({ title, children, action }: SectionProps) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-sm">{title}</h2>
        {action}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

export default function AdminShipmentDetail() {
  const [, params] = useRoute('/admin/shipments/:id');
  const shipmentId = Number(params?.id);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: shipment, isLoading } = useGetShipment(shipmentId, {
    query: { enabled: !!shipmentId, queryKey: getGetShipmentQueryKey(shipmentId) }
  });
  const { data: carriers } = useListCarriers();
  const { data: conversations } = useListConversations(shipmentId, {
    query: { enabled: !!shipmentId, queryKey: getListConversationsQueryKey(shipmentId) }
  });

  const updateShipment = useUpdateShipment();
  const updateStatus = useUpdateShipmentStatus();

  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [showInstruction, setShowInstruction] = useState(false);
  const [driverToken, setDriverToken] = useState<string | null>(null);
  const [generatingToken, setGeneratingToken] = useState(false);

  React.useEffect(() => {
    if (shipment) {
      setFormData({
        carrierCost: shipment.carrierCost || '',
        assignedCarrierId: shipment.assignedCarrierId ? String(shipment.assignedCarrierId) : 'unassigned',
        assignedDriverName: shipment.assignedDriverName || '',
        notes: shipment.notes || ''
      });
    }
  }, [shipment]);

  if (isLoading || !shipment) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateStatus.mutateAsync({ id: shipmentId, data: { status: newStatus } });
      queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
      toast({ title: 'ステータスを更新しました' });
    } catch {
      toast({ variant: 'destructive', title: '更新に失敗しました' });
    }
  };

  const handleSave = async () => {
    try {
      const payload: any = {
        notes: formData.notes,
        assignedDriverName: formData.assignedDriverName,
        carrierCost: formData.carrierCost ? Number(formData.carrierCost) : undefined,
        assignedCarrierId: formData.assignedCarrierId !== 'unassigned' ? Number(formData.assignedCarrierId) : null,
      };
      await updateShipment.mutateAsync({ id: shipmentId, data: payload });
      queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
      setEditMode(false);
      toast({ title: '保存しました' });
    } catch {
      toast({ variant: 'destructive', title: '保存に失敗しました' });
    }
  };

  const openInstruction = async () => {
    setShowInstruction(true);
    if (driverToken) return;
    setGeneratingToken(true);
    try {
      const token = localStorage.getItem('sinjapan_auth_token');
      const res = await fetch(`/api/driver/generate/${shipmentId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setDriverToken(data.token);
    } finally { setGeneratingToken(false); }
  };

  const handleSendInstruction = () => {
    setShowInstruction(false);
    toast({ title: '指示書を送付しました', description: `案件 #${shipment.id} の指示書を送付しました。` });
  };

  const driverPortalUrl = driverToken
    ? `${window.location.origin}${import.meta.env.BASE_URL.replace(/\/$/, '')}/driver/${driverToken}`
    : null;

  const statuses = [
    '受付中', 'ヒアリング中', '見積提示', '顧客承認',
    '手配中', '配車確定', '集荷完了', '配送中', '納品完了', '請求完了', 'キャンセル', 'キャンセル申請中'
  ];

  const grossProfit = Number(shipment.customerPrice || 0) - Number(shipment.carrierCost || 0);
  const profitRate = shipment.customerPrice
    ? Math.round((grossProfit / Number(shipment.customerPrice)) * 1000) / 10
    : 0;

  return (
    <div className="space-y-6 pb-20 max-w-5xl">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <Link href="/admin/shipments">
          <Button variant="ghost" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">案件 #{shipment.id}</h1>
        <div className="ml-auto flex items-center gap-3">
          <Select value={shipment.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-40 font-medium bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* キャンセル申請中バナー */}
      {shipment.status === 'キャンセル申請中' && (
        <div className="rounded-xl border border-orange-300 bg-orange-50 px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-orange-800 text-sm">キャンセル申請が届いています</p>
            <p className="text-xs text-orange-700 mt-0.5">顧客からキャンセルの申請があります。承認または却下してください。</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" variant="outline"
              className="border-orange-300 text-orange-700 hover:bg-orange-100 text-xs"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('sinjapan_auth_token');
                  await fetch(`/api/shipments/${shipment.id}/cancel-reject`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
                  queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
                  toast({ title: 'キャンセル申請を却下しました' });
                } catch { toast({ variant: 'destructive', title: '操作に失敗しました' }); }
              }}>
              却下
            </Button>
            <Button size="sm"
              className="bg-red-600 hover:bg-red-700 text-white text-xs"
              onClick={async () => {
                try {
                  const token = localStorage.getItem('sinjapan_auth_token');
                  await fetch(`/api/shipments/${shipment.id}/cancel-approve`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } });
                  queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
                  toast({ title: 'キャンセルを承認しました' });
                } catch { toast({ variant: 'destructive', title: '操作に失敗しました' }); }
              }}>
              キャンセル承認
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* 左カラム */}
        <div className="lg:col-span-3 space-y-5">

          {/* 配送情報 */}
          <Section title="配送情報">
            <Row label="集荷先" value={
              <span>
                {shipment.pickupAddress}
                <br />
                <span className="text-xs text-muted-foreground font-normal">{shipment.pickupDatetime}</span>
              </span>
            } />
            <Row label="納品先" value={
              <span>
                {shipment.deliveryAddress}
                <br />
                <span className="text-xs text-muted-foreground font-normal">{shipment.deliveryDeadline}</span>
              </span>
            } />
            <Row label="荷物" value={[shipment.cargoType, shipment.cargoQuantity].filter(Boolean).join(' / ')} />
            <Row label="重量・サイズ" value={[shipment.cargoWeight, shipment.cargoSize].filter(Boolean).join(' / ')} />
            <Row label="車両・配送方法" value={[shipment.vehicleType, shipment.deliveryMethod].filter(Boolean).join(' / ')} />
          </Section>

          {/* 手配内容 */}
          <Section
            title="手配内容"
            action={
              editMode ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>キャンセル</Button>
                  <Button size="sm" onClick={handleSave} disabled={updateShipment.isPending}>
                    <Save className="h-3.5 w-3.5 mr-1.5" />保存
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>
                  <Pencil className="h-3.5 w-3.5 mr-1.5" />編集
                </Button>
              )
            }
          >
            {editMode ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">運送会社</Label>
                    <Select
                      value={formData.assignedCarrierId}
                      onValueChange={(v) => setFormData({ ...formData, assignedCarrierId: v })}
                    >
                      <SelectTrigger><SelectValue placeholder="未定" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">未定</SelectItem>
                        {carriers?.map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">ドライバー名</Label>
                    <Input
                      value={formData.assignedDriverName}
                      onChange={(e) => setFormData({ ...formData, assignedDriverName: e.target.value })}
                      placeholder="山田 太郎"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">原価（円）</Label>
                    <Input
                      type="number"
                      value={formData.carrierCost}
                      onChange={(e) => setFormData({ ...formData, carrierCost: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">管理者メモ</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <Row label="運送会社" value={(shipment as any).driverCarrierName || shipment.carrier?.companyName} />
                <Row label="ドライバー名" value={shipment.assignedDriverName} />
                {(shipment as any).driverPhone && (
                  <Row label="ドライバー連絡先" value={
                    <a href={`tel:${(shipment as any).driverPhone}`} className="hover:underline text-foreground">
                      {(shipment as any).driverPhone}
                    </a>
                  } />
                )}
                {(shipment as any).driverVehicleNumber && (
                  <Row label="車番" value={(shipment as any).driverVehicleNumber} />
                )}
                <Row label="原価" value={shipment.carrierCost ? `¥ ${fmt(shipment.carrierCost)}` : undefined} />
                {driverPortalUrl && (
                  <div className="px-4 py-3 flex items-start gap-3 border-b border-border/40 last:border-0">
                    <span className="text-sm text-muted-foreground w-24 shrink-0">ドライバーURL</span>
                    <a href={driverPortalUrl} target="_blank" rel="noreferrer"
                      className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 break-all">
                      {driverPortalUrl}
                    </a>
                  </div>
                )}
                <div className="pt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">管理者メモ</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded-lg p-3 min-h-[48px]">
                    {shipment.notes || 'メモなし'}
                  </p>
                </div>
              </div>
            )}
          </Section>

          {/* 指示書送付ボタン */}
          <button
            onClick={openInstruction}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-foreground text-background py-4 text-sm font-medium hover:opacity-80 transition-opacity"
          >
            <FileText className="h-4 w-4" />
            指示書を送付する
          </button>
        </div>

        {/* 右カラム */}
        <div className="lg:col-span-2 space-y-5">

          {/* 収益サマリー */}
          <div className="bg-primary text-primary-foreground rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-primary-foreground/10">
              <h2 className="font-semibold text-sm">収益</h2>
            </div>
            <div className="divide-y divide-primary-foreground/10">
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-primary-foreground/70">売上</span>
                <span className="font-semibold">¥ {fmt(shipment.customerPrice)}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-3">
                <span className="text-sm text-primary-foreground/70">原価</span>
                <span className="font-semibold">¥ {fmt(shipment.carrierCost)}</span>
              </div>
              <div className="flex justify-between items-center px-5 py-4">
                <span className="text-sm font-bold">粗利</span>
                <div className="text-right">
                  <div className="text-xl font-bold">¥ {fmt(grossProfit)}</div>
                  <div className="text-xs text-primary-foreground/60">{profitRate}%</div>
                </div>
              </div>
            </div>
          </div>

          {/* 決済ステータス */}
          {(() => {
            const s = shipment as any;
            const paymentId = s.squarePaymentId;
            const captured = s.squareCaptured;
            if (!paymentId && shipment.status !== '納品完了') return null;
            return (
              <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-border">
                  <h2 className="font-semibold text-sm">決済</h2>
                </div>
                <div className="px-5 py-4 space-y-3">
                  {paymentId ? (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">ステータス</span>
                        <span className={`font-semibold ${captured === 'true' ? 'text-green-600' : 'text-amber-600'}`}>
                          {captured === 'true' ? '決済完了' : 'オーソリ済み（未キャプチャ）'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Square Payment ID</span>
                        <span className="font-mono text-xs text-muted-foreground truncate max-w-[140px]">{paymentId}</span>
                      </div>
                      {captured !== 'true' && shipment.status === '納品完了' && (
                        <Button
                          className="w-full mt-2"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem('sinjapan_auth_token');
                              const res = await fetch(`/api/square/capture/${paymentId}`, {
                                method: 'POST',
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (!res.ok) throw new Error();
                              queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
                              toast({ title: 'キャプチャ完了・請求完了に更新しました' });
                            } catch {
                              toast({ variant: 'destructive', title: 'キャプチャに失敗しました' });
                            }
                          }}
                        >
                          キャプチャ（決済確定）
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">カード未登録またはオーソリ未実行</p>
                      <Button variant="outline" size="sm" className="w-full text-xs"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('sinjapan_auth_token');
                            const res = await fetch(`/api/square/authorize-on-file/${shipmentId}`, {
                              method: 'POST',
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!res.ok) {
                              const d = await res.json();
                              throw new Error(d.error ?? '失敗');
                            }
                            queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
                            toast({ title: 'オーソリを実行しました' });
                          } catch (e: any) {
                            toast({ variant: 'destructive', title: `オーソリ失敗: ${e.message}` });
                          }
                        }}>
                        手動でオーソリを実行
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* AIヒアリング履歴 */}
          <div className="bg-card border border-border rounded-xl shadow-sm">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">AIヒアリング履歴</h2>
            </div>
            <div className="px-4 py-4 max-h-[480px] overflow-y-auto space-y-3">
              {!conversations || conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">履歴はありません</p>
              ) : (
                conversations.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isUser ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground'}`}>
                        {isUser ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                      </div>
                      <div className={`text-xs rounded-2xl px-3 py-2.5 leading-relaxed whitespace-pre-wrap max-w-[82%] ${
                        isUser ? 'bg-foreground text-background rounded-tr-sm' : 'bg-muted text-foreground rounded-tl-sm'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* GPS位置 */}
          {(() => {
            const s = shipment as any;
            const lat = s.driverLat ? Number(s.driverLat) : null;
            const lng = s.driverLng ? Number(s.driverLng) : null;
            if (!lat || !lng) return null;
            const updatedAt = s.driverLocationUpdatedAt ? new Date(s.driverLocationUpdatedAt) : null;
            const minsAgo = updatedAt ? Math.round((Date.now() - updatedAt.getTime()) / 60000) : null;
            const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng-0.015},${lat-0.010},${lng+0.015},${lat+0.010}&layer=mapnik&marker=${lat},${lng}`;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
            return (
              <div className="rounded-xl border border-border shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-sm">ドライバー位置</span>
                  </div>
                  {minsAgo !== null && (
                    <span className="text-xs text-muted-foreground">{minsAgo === 0 ? 'たった今' : `${minsAgo}分前`}</span>
                  )}
                </div>
                <iframe src={embedUrl} className="w-full h-52 border-0" title="ドライバー位置" />
                <div className="px-4 py-2.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground font-mono">{lat.toFixed(5)}, {lng.toFixed(5)}</span>
                  <a href={mapsUrl} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <MapPin className="h-3 w-3" />Googleマップ
                  </a>
                </div>
              </div>
            );
          })()}

        </div>
      </div>

      {/* 指示書送付モーダル */}
      {showInstruction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowInstruction(false)} />
          <div className="relative bg-background rounded-2xl shadow-2xl w-full max-w-lg z-10">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <div className="flex items-center gap-2 font-semibold">
                <FileText className="h-4 w-4" />
                指示書送付
              </div>
              <button onClick={() => setShowInstruction(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-muted-foreground">以下の内容で運送会社へ指示書を送付します。</p>

              {/* ドライバーポータルリンク */}
              <div className="bg-foreground text-background rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold opacity-70">ドライバーポータルURL</p>
                {generatingToken ? (
                  <div className="flex items-center gap-2 text-sm opacity-70">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />生成中...
                  </div>
                ) : driverPortalUrl ? (
                  <>
                    <p className="text-xs break-all font-mono opacity-80">{driverPortalUrl}</p>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => { navigator.clipboard.writeText(driverPortalUrl); toast({ title: 'URLをコピーしました' }); }}
                        className="flex-1 py-1.5 text-xs rounded-lg bg-background/20 hover:bg-background/30 transition-colors font-medium"
                      >
                        URLをコピー
                      </button>
                      <a
                        href={driverPortalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-1.5 text-xs rounded-lg bg-background/20 hover:bg-background/30 transition-colors font-medium text-center"
                      >
                        プレビュー
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="text-xs opacity-60">URL生成に失敗しました</p>
                )}
              </div>

              <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3 text-sm">
                <div className="font-bold text-base border-b border-border pb-2">配送指示書 — 案件 #{shipment.id}</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
                  <span className="text-muted-foreground">運送会社</span>
                  <span className="font-medium">{shipment.carrier?.companyName || '未定'}</span>
                  <span className="text-muted-foreground">ドライバー</span>
                  <span className="font-medium">{shipment.assignedDriverName || '未定'}</span>
                  <span className="text-muted-foreground">集荷先</span>
                  <span className="font-medium">{shipment.pickupAddress || '—'}</span>
                  <span className="text-muted-foreground">集荷日時</span>
                  <span className="font-medium">{shipment.pickupDatetime || '—'}</span>
                  <span className="text-muted-foreground">納品先</span>
                  <span className="font-medium">{shipment.deliveryAddress || '—'}</span>
                  <span className="text-muted-foreground">納品期限</span>
                  <span className="font-medium">{shipment.deliveryDeadline || '—'}</span>
                  <span className="text-muted-foreground">荷物</span>
                  <span className="font-medium">{[shipment.cargoType, shipment.cargoQuantity].filter(Boolean).join(' / ') || '—'}</span>
                  <span className="text-muted-foreground">車両</span>
                  <span className="font-medium">{shipment.vehicleType || '—'}</span>
                </div>
                {shipment.notes && (
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground text-xs">備考：</span>
                    <p className="mt-1 whitespace-pre-wrap">{shipment.notes}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-border">
              <Button variant="outline" onClick={() => setShowInstruction(false)}>キャンセル</Button>
              <Button className="gap-2" onClick={handleSendInstruction}>
                <Send className="h-4 w-4" />
                送付する
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
