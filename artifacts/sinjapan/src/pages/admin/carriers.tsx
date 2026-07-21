import React, { useState } from 'react';
import { useListCarriers, useCreateCarrier } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Plus, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export default function AdminCarriers() {
  const queryClient = useQueryClient();
  const { data: carriers, isLoading } = useListCarriers();
  const createCarrier = useCreateCarrier();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState({
    companyName: '',
    contactName: '',
    phone: '',
    serviceAreas: '',
    vehicleTypes: ''
  });

  const handleCreate = async () => {
    try {
      await createCarrier.mutateAsync({
        data: formData
      });
      setIsAddOpen(false);
      setFormData({ companyName: '', contactName: '', phone: '', serviceAreas: '', vehicleTypes: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">運送会社管理</h1>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              新規登録
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>運送会社の登録</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>会社名</Label>
                <Input 
                  value={formData.companyName} 
                  onChange={e => setFormData({...formData, companyName: e.target.value})} 
                  placeholder="株式会社物流" 
                />
              </div>
              <div className="space-y-2">
                <Label>担当者名</Label>
                <Input 
                  value={formData.contactName} 
                  onChange={e => setFormData({...formData, contactName: e.target.value})} 
                  placeholder="佐藤" 
                />
              </div>
              <div className="space-y-2">
                <Label>電話番号</Label>
                <Input 
                  value={formData.phone} 
                  onChange={e => setFormData({...formData, phone: e.target.value})} 
                  placeholder="03-0000-0000" 
                />
              </div>
              <div className="space-y-2">
                <Label>対応エリア</Label>
                <Input 
                  value={formData.serviceAreas} 
                  onChange={e => setFormData({...formData, serviceAreas: e.target.value})} 
                  placeholder="関東全域" 
                />
              </div>
              <div className="space-y-2">
                <Label>保有車両</Label>
                <Input 
                  value={formData.vehicleTypes} 
                  onChange={e => setFormData({...formData, vehicleTypes: e.target.value})} 
                  placeholder="2t, 4tウィング, 10t" 
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={createCarrier.isPending || !formData.companyName}>
                {createCarrier.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                登録する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full py-12 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : carriers?.map((carrier) => (
          <Card key={carrier.id} className="border-border shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50 bg-muted/10">
              <div className="flex justify-between items-start">
                <CardTitle className="text-base font-bold">{carrier.companyName}</CardTitle>
                {carrier.rating && (
                  <div className="flex items-center text-sm font-medium text-amber-500">
                    <Star className="h-3 w-3 fill-current mr-1" />
                    {carrier.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-muted-foreground">担当者</div>
                <div className="col-span-2 font-medium">{carrier.contactName || '-'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-muted-foreground">電話</div>
                <div className="col-span-2 font-medium">{carrier.phone || '-'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-muted-foreground">エリア</div>
                <div className="col-span-2">{carrier.serviceAreas || '-'}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-muted-foreground">車両</div>
                <div className="col-span-2 text-xs">{carrier.vehicleTypes || '-'}</div>
              </div>
              <div className="flex justify-between items-center pt-3 border-t border-border/50 mt-3 text-xs text-muted-foreground">
                <span>総受託件数: {carrier.totalOrders}件</span>
                {carrier.onTimeRate && <span>時間遵守率: {carrier.onTimeRate}%</span>}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
