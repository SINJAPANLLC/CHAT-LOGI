import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetShipment, useUpdateShipment, useUpdateShipmentStatus, useListCarriers, getGetShipmentQueryKey, useListConversations, getListConversationsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, Save, MessageSquare } from 'lucide-react';
import { Link } from 'wouter';
import { useToast } from '@/hooks/use-toast';

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

  // Local state for editing
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
      await updateStatus.mutateAsync({
        id: shipmentId,
        data: { status: newStatus }
      });
      queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
      toast({ title: 'ステータスを更新しました' });
    } catch (err) {
      toast({ variant: 'destructive', title: '更新に失敗しました' });
    }
  };

  const handleSaveDetails = async () => {
    try {
      const payload: any = {
        notes: formData.notes,
        assignedDriverName: formData.assignedDriverName
      };

      if (formData.carrierCost) {
        payload.carrierCost = Number(formData.carrierCost);
      }
      
      if (formData.assignedCarrierId && formData.assignedCarrierId !== 'unassigned') {
        payload.assignedCarrierId = Number(formData.assignedCarrierId);
      } else {
        payload.assignedCarrierId = null;
      }

      await updateShipment.mutateAsync({
        id: shipmentId,
        data: payload
      });
      
      queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
      setEditMode(false);
      toast({ title: '詳細を保存しました' });
    } catch (err) {
      toast({ variant: 'destructive', title: '保存に失敗しました' });
    }
  };

  const statuses = [
    '受付中', 'ヒアリング中', '見積提示', '顧客承認', 
    '手配中', '配車確定', '集荷完了', '配送中', '納品完了', '請求完了', 'キャンセル'
  ];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/shipments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">案件 #{shipment.id}</h1>
        <div className="ml-auto flex items-center gap-3">
          <Select 
            value={shipment.status} 
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-40 font-medium bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statuses.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline">通知を送信</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">配送・手配情報</CardTitle>
              {!editMode ? (
                <Button variant="ghost" size="sm" onClick={() => setEditMode(true)}>編集</Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>キャンセル</Button>
                  <Button size="sm" onClick={handleSaveDetails} disabled={updateShipment.isPending}>
                    <Save className="h-4 w-4 mr-2" /> 保存
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">集荷先</Label>
                  <p className="text-sm font-medium">{shipment.pickupAddress}</p>
                  <p className="text-xs text-muted-foreground">{shipment.pickupDatetime}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">納品先</Label>
                  <p className="text-sm font-medium">{shipment.deliveryAddress}</p>
                  <p className="text-xs text-muted-foreground">{shipment.deliveryDeadline}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">荷物詳細</Label>
                  <p className="text-sm font-medium">{shipment.cargoType} ({shipment.cargoQuantity})</p>
                  <p className="text-xs text-muted-foreground">{shipment.cargoWeight} / {shipment.cargoSize}</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">車両・配送方法</Label>
                  <p className="text-sm font-medium">{shipment.vehicleType} / {shipment.deliveryMethod}</p>
                </div>
              </div>

              <div className="border-t border-border/50 pt-4 bg-muted/20 p-4 rounded-lg space-y-4">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  手配内容
                </h3>
                {editMode ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>運送会社</Label>
                      <Select 
                        value={formData.assignedCarrierId}
                        onValueChange={(val) => setFormData({...formData, assignedCarrierId: val})}
                      >
                        <SelectTrigger className="bg-background">
                          <SelectValue placeholder="未定" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">未定</SelectItem>
                          {carriers?.map(c => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.companyName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>ドライバー名</Label>
                      <Input 
                        value={formData.assignedDriverName}
                        onChange={(e) => setFormData({...formData, assignedDriverName: e.target.value})}
                        className="bg-background"
                        placeholder="山田 太郎"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>原価 (円)</Label>
                      <Input 
                        type="number"
                        value={formData.carrierCost}
                        onChange={(e) => setFormData({...formData, carrierCost: e.target.value})}
                        className="bg-background"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">運送会社</Label>
                      <p className="text-sm font-medium">
                        {shipment.carrier?.companyName || '未定'}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">ドライバー名</Label>
                      <p className="text-sm font-medium">{shipment.assignedDriverName || '未定'}</p>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">原価</Label>
                      <p className="text-sm font-medium">
                        {shipment.carrierCost ? new Intl.NumberFormat('ja-JP').format(shipment.carrierCost) + ' 円' : '未定'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2 border-t border-border/50 pt-4">
                <Label className="text-xs text-muted-foreground">管理者用メモ</Label>
                {editMode ? (
                  <Textarea 
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="min-h-[100px] bg-background"
                  />
                ) : (
                  <p className="text-sm bg-muted/30 p-3 rounded border border-border/50 min-h-[60px] whitespace-pre-wrap">
                    {shipment.notes || 'メモなし'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="bg-primary text-primary-foreground">
              <CardTitle className="text-lg">収益</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm font-medium">売上 (顧客提示額)</span>
                  <span className="font-bold">{shipment.customerPrice ? new Intl.NumberFormat('ja-JP').format(shipment.customerPrice) : 0} 円</span>
                </div>
                <div className="p-4 flex justify-between items-center text-muted-foreground">
                  <span className="text-sm">原価 (運送会社費用)</span>
                  <span>{shipment.carrierCost ? new Intl.NumberFormat('ja-JP').format(shipment.carrierCost) : 0} 円</span>
                </div>
                <div className="p-4 flex justify-between items-center bg-muted/20">
                  <span className="text-sm font-bold">粗利</span>
                  <span className="font-bold text-lg">{shipment.grossProfit ? new Intl.NumberFormat('ja-JP').format(shipment.grossProfit) : 0} 円</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> AIヒアリング履歴
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-[400px] overflow-y-auto space-y-4">
              {!conversations || conversations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">履歴はありません</p>
              ) : (
                conversations.map((msg) => (
                  <div key={msg.id} className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {msg.sender === 'user' ? '顧客' : 'AI'}
                    </div>
                    <div className={`text-xs p-3 rounded-lg max-w-[90%] ${
                      msg.sender === 'user' 
                        ? 'bg-muted text-foreground' 
                        : 'border border-border bg-card'
                    }`}>
                      {msg.message}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
