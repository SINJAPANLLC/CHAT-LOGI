import React from 'react';
import { Link } from 'wouter';
import { useListShipments } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Package, ChevronRight, Loader2, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

function StatusBadge({ status }: { status: string }) {
  if (status === '納品完了') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">
        <CreditCard className="h-3 w-3" />
        決済待ち
      </span>
    );
  }
  if (status === '請求完了') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
        支払い完了
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground border border-border">
      {status}
    </span>
  );
}

export default function History() {
  const { data: shipments, isLoading } = useListShipments({});

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">利用履歴</h1>
      </div>

      {(!shipments?.items || shipments.items.length === 0) ? (
        <div className="text-center py-20 border border-dashed border-border rounded-xl bg-muted/20">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">履歴がありません</h3>
          <p className="text-muted-foreground mt-2 mb-6">まだ配送依頼がありません。</p>
          <Link href="/">
            <Button>新規依頼を作成</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {shipments.items.map((shipment) => (
            <Card key={shipment.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center">
                  <div className="p-4 md:p-6 flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-1">
                      <p className="text-xs text-muted-foreground mb-1">
                        {format(new Date(shipment.createdAt), 'yyyy年MM月dd日', { locale: ja })}
                      </p>
                      <StatusBadge status={shipment.status} />
                    </div>
                    
                    <div className="md:col-span-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-8">集荷</span>
                        <span className="text-sm truncate" title={shipment.pickupAddress || ''}>{shipment.pickupAddress || '未定'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground w-8">納品</span>
                        <span className="text-sm truncate" title={shipment.deliveryAddress || ''}>{shipment.deliveryAddress || '未定'}</span>
                      </div>
                    </div>

                    <div className="md:col-span-1 text-right flex flex-col justify-center">
                      <p className="font-bold text-lg">
                        {shipment.customerPrice ? new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(shipment.customerPrice) : '見積中'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-muted/30 border-t md:border-t-0 md:border-l border-border p-4 flex gap-2 md:flex-col md:w-36 justify-center shrink-0">
                    {shipment.status === '納品完了' && (
                      <Link href={`/payment/${shipment.id}`} className="w-full">
                        <Button className="w-full h-9 px-3 text-xs bg-orange-500 hover:bg-orange-600 text-white">
                          <CreditCard className="h-3.5 w-3.5 mr-1.5" />
                          決済へ進む
                        </Button>
                      </Link>
                    )}
                    <Link href={`/shipment/${shipment.id}`} className="w-full">
                      <Button variant="ghost" className="w-full justify-between h-9 px-3">
                        詳細
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
