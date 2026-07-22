import React, { useState } from 'react';
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
import { Loader2, ArrowLeft, Save, Pencil, Bot, User } from 'lucide-react';
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

function Section({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
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

  const statuses = [
    '受付中', 'ヒアリング中', '見積提示', '顧客承認',
    '手配中', '配車確定', '集荷完了', '配送中', '納品完了', '請求完了', 'キャンセル'
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
          <Button variant="outline">通知を送信</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start lg:items-stretch">
        {/* 左カラム */}
        <div className="lg:col-span-3 space-y-5">

          {/* 配送情報 */}
          <Section title="配送情報">
            <Row label="集荷先" value={
              <span>{shipment.pickupAddress}<br /><span className="text-xs text-muted-foreground font-normal">{shipment.pickupDatetime}</span></span>
            } />
            <Row label="納品先" value={
              <span>{shipment.deliveryAddress}<br /><span className="text-xs text-muted-foreground font-normal">{shipment.deliveryDeadline}</span></span>
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
              <>
                <Row label="運送会社" value={shipment.carrier?.companyName} />
                <Row label="ドライバー名" value={shipment.assignedDriverName} />
                <Row label="原価" value={shipment.carrierCost ? `¥ ${fmt(shipment.carrierCost)}` : undefined} />
                <div className="pt-3">
                  <p className="text-xs text-muted-foreground mb-1.5">管理者メモ</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground bg-muted/30 rounded-lg p-3 min-h-[48px]">
                    {shipment.notes || 'メモなし'}
                  </p>
                </div>
              </>
            )}
          </Section>
        </div>

        {/* 右カラム */}
        <div className="lg:col-span-2 flex flex-col gap-5">

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

          {/* AIヒアリング履歴 */}
          <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 min-h-0">
            <div className="flex items-center gap-2 px-5 py-4 border-b border-border shrink-0">
              <Bot className="h-4 w-4 text-muted-foreground" />
              <h2 className="font-semibold text-sm">AIヒアリング履歴</h2>
            </div>
            <div className="px-4 py-4 overflow-y-auto space-y-3 flex-1">
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
        </div>
      </div>
    </div>
  );
}
