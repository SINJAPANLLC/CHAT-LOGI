import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useGetShipment, useCreatePayment, getGetShipmentQueryKey } from '@workspace/api-client-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CreditCard, Receipt, Building2, CheckCircle } from 'lucide-react';

export default function Payment() {
  const [, params] = useRoute('/payment/:id');
  const shipmentId = Number(params?.id);
  const [, setLocation] = useLocation();

  const [method, setMethod] = useState<string>('credit_card');

  const { data: shipment, isLoading } = useGetShipment(shipmentId, {
    query: { enabled: !!shipmentId, queryKey: getGetShipmentQueryKey(shipmentId) }
  });

  const createPayment = useCreatePayment();

  if (isLoading || !shipment) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const basePrice = shipment.customerPrice || 0;
  const tax = Math.floor(basePrice * 0.1);
  const total = basePrice + tax;

  const handlePayment = async () => {
    try {
      await createPayment.mutateAsync({
        data: {
          shipmentId: shipmentId,
          amount: basePrice,
          paymentMethod: method
        }
      });
      setLocation('/history');
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-8 flex justify-center items-start bg-muted/10">
      <div className="w-full max-w-xl animate-in fade-in duration-500">
        
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">お支払い</h1>
          <p className="text-muted-foreground mt-2">
            配送が完了しました。ご請求内容をご確認ください。
          </p>
        </div>

        <Card className="border-border shadow-sm mb-6">
          <CardHeader className="bg-muted/30 border-b border-border/50">
            <CardTitle className="text-lg">ご請求内訳</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">配送費（ID: #{shipment.id}）</span>
                <span className="font-medium">{new Intl.NumberFormat('ja-JP').format(basePrice)} 円</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">消費税 (10%)</span>
                <span className="font-medium">{new Intl.NumberFormat('ja-JP').format(tax)} 円</span>
              </div>
              <div className="pt-4 border-t border-border flex justify-between items-center">
                <span className="font-bold">合計金額</span>
                <span className="text-2xl font-bold tracking-tight">
                  {new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="border-b border-border/50">
            <CardTitle className="text-lg">お支払い方法</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-3">
              {[
                { id: 'credit_card', label: 'クレジットカード', icon: CreditCard },
                { id: 'invoice', label: '請求書払い（掛け払い）', icon: Receipt },
                { id: 'bank_transfer', label: '銀行振込', icon: Building2 },
              ].map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setMethod(opt.id)}
                  className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                    method === opt.id 
                      ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <opt.icon className={`h-5 w-5 mr-3 ${method === opt.id ? 'text-primary' : 'text-muted-foreground'}`} />
                  <span className={`font-medium ${method === opt.id ? 'text-primary' : 'text-foreground'}`}>
                    {opt.label}
                  </span>
                  {method === opt.id && (
                    <CheckCircle className="h-5 w-5 ml-auto text-primary" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="p-6 pt-0">
            <Button 
              className="w-full h-12 text-md"
              onClick={handlePayment}
              disabled={createPayment.isPending}
            >
              {createPayment.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : '支払いを確定する'}
            </Button>
          </CardFooter>
        </Card>

      </div>
    </div>
  );
}
