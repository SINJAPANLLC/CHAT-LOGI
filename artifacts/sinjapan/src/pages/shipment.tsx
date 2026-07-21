import React from 'react';
import { useRoute, Link } from 'wouter';
import { useGetShipment, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Circle, Loader2, ArrowRight } from 'lucide-react';

const STATUS_FLOW = [
  '受付完了',
  '手配中',
  '配車確定',
  '集荷完了',
  '配送中',
  '納品完了'
];

export default function Shipment() {
  const [, params] = useRoute('/shipment/:id');
  const shipmentId = Number(params?.id);

  const { data: shipment, isLoading } = useGetShipment(shipmentId, {
    query: {
      enabled: !!shipmentId,
      queryKey: getGetShipmentQueryKey(shipmentId),
      refetchInterval: 5000 // Poll for status updates
    }
  });

  if (isLoading || !shipment) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Handle case where it's not yet in the flow
  let currentIndex = STATUS_FLOW.indexOf(shipment.status);
  
  // Map internal states to the visible flow
  if (shipment.status === '顧客承認') currentIndex = 0;
  if (currentIndex === -1 && shipment.status !== 'キャンセル' && shipment.status !== '請求完了') {
    currentIndex = 0;
  }

  const isComplete = shipment.status === '納品完了' || shipment.status === '請求完了';

  return (
    <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-3xl space-y-8 animate-in fade-in duration-500">
        
        <div className="flex flex-col md:flex-row gap-8">
          {/* Status Stepper */}
          <div className="w-full md:w-1/3">
            <h2 className="text-xl font-bold mb-6">配送状況</h2>
            <div className="space-y-6">
              {STATUS_FLOW.map((status, index) => {
                const isPast = index < currentIndex;
                const isCurrent = index === currentIndex;
                
                return (
                  <div key={status} className="flex items-start gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center border-2 ${
                        isPast 
                          ? 'bg-primary border-primary text-primary-foreground' 
                          : isCurrent 
                            ? 'border-primary bg-background text-primary' 
                            : 'border-muted-foreground/30 text-muted-foreground/30'
                      }`}>
                        {isPast ? <Check className="h-4 w-4" /> : <Circle className="h-2 w-2 fill-current" />}
                      </div>
                      {index < STATUS_FLOW.length - 1 && (
                        <div className={`w-0.5 h-10 mt-2 ${
                          isPast ? 'bg-primary' : 'bg-border'
                        }`} />
                      )}
                    </div>
                    <div className="pt-1">
                      <p className={`font-medium ${
                        isPast || isCurrent ? 'text-foreground' : 'text-muted-foreground'
                      }`}>
                        {status}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {status === '受付完了' && '手配を開始します'}
                          {status === '手配中' && '車両を探しています'}
                          {status === '配車確定' && '車両が確定しました'}
                          {status === '集荷完了' && '荷物をお預かりしました'}
                          {status === '配送中' && 'お届け先へ配送中です'}
                          {status === '納品完了' && '配送が完了しました'}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {isComplete && shipment.paymentStatus !== 'paid' && (
              <div className="mt-10">
                <Link href={`/payment/${shipmentId}`}>
                  <Button className="w-full h-12 text-md">
                    決済へ進む
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Details */}
          <div className="w-full md:w-2/3">
            <Card className="border-border shadow-sm">
              <CardHeader className="bg-muted/30 border-b border-border/50">
                <CardTitle className="text-lg">案件詳細</CardTitle>
                <p className="text-sm text-muted-foreground">ID: #{shipment.id.toString().padStart(6, '0')}</p>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y divide-border/50">
                  
                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">集荷先</div>
                    <div className="col-span-2 text-sm font-medium">
                      {shipment.pickupAddress}
                      <div className="text-xs text-muted-foreground font-normal mt-1">{shipment.pickupDatetime}</div>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">納品先</div>
                    <div className="col-span-2 text-sm font-medium">
                      {shipment.deliveryAddress}
                      <div className="text-xs text-muted-foreground font-normal mt-1">{shipment.deliveryDeadline}</div>
                    </div>
                  </div>

                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">荷物</div>
                    <div className="col-span-2 text-sm">
                      {shipment.cargoType} ({shipment.cargoQuantity})
                    </div>
                  </div>

                  {shipment.assignedDriverName && (
                    <div className="p-4 grid grid-cols-3 gap-4 bg-muted/20">
                      <div className="text-sm text-muted-foreground">ドライバー</div>
                      <div className="col-span-2 text-sm font-medium">
                        {shipment.assignedDriverName}
                      </div>
                    </div>
                  )}

                  <div className="p-4 grid grid-cols-3 gap-4">
                    <div className="text-sm text-muted-foreground">料金</div>
                    <div className="col-span-2 text-sm font-bold">
                      {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(shipment.customerPrice || 0)}
                      <span className="text-xs font-normal text-muted-foreground ml-1">(税別)</span>
                    </div>
                  </div>

                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
