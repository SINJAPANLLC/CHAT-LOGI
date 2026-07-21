import React from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetShipment, useUpdateShipmentStatus, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, Calendar, Box, CheckCircle, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Proposal() {
  const [, params] = useRoute('/proposal/:id');
  const shipmentId = Number(params?.id);
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: shipment, isLoading } = useGetShipment(shipmentId, {
    query: {
      enabled: !!shipmentId,
      queryKey: getGetShipmentQueryKey(shipmentId)
    }
  });

  const updateStatus = useUpdateShipmentStatus();

  const handleApprove = async () => {
    await updateStatus.mutateAsync({
      id: shipmentId,
      data: { status: '顧客承認' }
    });
    queryClient.invalidateQueries({ queryKey: getGetShipmentQueryKey(shipmentId) });
    setLocation(`/shipment/${shipmentId}`);
  };

  const handleModify = () => {
    // Go back to chat to modify
    setLocation(`/chat/${shipmentId}`);
  };

  if (isLoading || !shipment) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-border/50 shadow-sm">
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format currency
  const formatPrice = (price?: number | null) => {
    if (!price) return '未定';
    return new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(price);
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight">ご提案内容</h1>
          <p className="text-muted-foreground mt-2">
            ヒアリングの内容に基づき、最適な配送プランを手配いたしました。
          </p>
        </div>

        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/30 border-b border-border/50 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-medium flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                SINJAPAN 推奨プラン
              </CardTitle>
              <div className="text-2xl font-bold tracking-tight">
                {formatPrice(shipment.customerPrice)}
                <span className="text-sm font-normal text-muted-foreground ml-1">(税別)</span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              
              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Box className="h-4 w-4" /> 荷物情報
                </div>
                <div className="md:col-span-2 space-y-1">
                  <p className="font-medium">{shipment.cargoType || '指定なし'} ({shipment.cargoQuantity || '数量未定'})</p>
                  {(shipment.cargoWeight || shipment.cargoSize) && (
                    <p className="text-sm text-muted-foreground">
                      {shipment.cargoWeight && `重量: ${shipment.cargoWeight} `}
                      {shipment.cargoSize && `サイズ: ${shipment.cargoSize}`}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Calendar className="h-4 w-4" /> 日程
                </div>
                <div className="md:col-span-2 space-y-3">
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">集荷</span>
                    <p className="font-medium">{shipment.pickupDatetime || '未定'}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{shipment.pickupAddress || '未定'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground block mb-1">納品</span>
                    <p className="font-medium">{shipment.deliveryDeadline || '未定'}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{shipment.deliveryAddress || '未定'}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-sm text-muted-foreground font-medium flex items-center gap-2">
                  <Truck className="h-4 w-4" /> 車両・配送方法
                </div>
                <div className="md:col-span-2">
                  <p className="font-medium">{shipment.vehicleType || '最適車両'} / {shipment.deliveryMethod || 'チャーター便'}</p>
                </div>
              </div>

              {shipment.notes && (
                <div className="p-6 bg-muted/20">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {shipment.notes}
                  </p>
                </div>
              )}

            </div>
          </CardContent>
          <CardFooter className="p-6 pt-6 border-t border-border flex flex-col sm:flex-row gap-3">
            <Button 
              variant="outline" 
              className="w-full sm:w-1/3"
              onClick={handleModify}
              disabled={updateStatus.isPending}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              条件を変更する
            </Button>
            <Button 
              className="w-full sm:w-2/3"
              onClick={handleApprove}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? '処理中...' : 'この内容で依頼する'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
