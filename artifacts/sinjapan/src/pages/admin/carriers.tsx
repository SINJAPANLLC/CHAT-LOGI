import React, { useState } from 'react';
import { useListCarriers, useCreateCarrier } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
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
    companyName: '', contactName: '', phone: '', serviceAreas: '', vehicleTypes: ''
  });

  const handleCreate = async () => {
    try {
      await createCarrier.mutateAsync({ data: formData });
      setIsAddOpen(false);
      setFormData({ companyName: '', contactName: '', phone: '', serviceAreas: '', vehicleTypes: '' });
      queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">運送会社管理</h1>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" />新規登録</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader><DialogTitle>運送会社の登録</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              {[
                { label: '会社名', key: 'companyName', placeholder: '株式会社物流' },
                { label: '担当者名', key: 'contactName', placeholder: '佐藤' },
                { label: '電話番号', key: 'phone', placeholder: '03-0000-0000' },
                { label: '対応エリア', key: 'serviceAreas', placeholder: '関東全域' },
                { label: '保有車両', key: 'vehicleTypes', placeholder: '2t, 4tウィング, 10t' },
              ].map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-2">
                  <Label>{label}</Label>
                  <Input
                    value={(formData as any)[key]}
                    onChange={e => setFormData({ ...formData, [key]: e.target.value })}
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>キャンセル</Button>
              <Button onClick={handleCreate} disabled={createCarrier.isPending || !formData.companyName}>
                {createCarrier.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                登録する
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">会社名</th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">担当者</th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">電話</th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">エリア</th>
              <th className="px-5 py-3.5 text-left font-medium text-muted-foreground">車両</th>
              <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">評価</th>
              <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">受託件数</th>
              <th className="px-5 py-3.5 text-right font-medium text-muted-foreground">時間遵守率</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </td>
              </tr>
            ) : !carriers?.length ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-muted-foreground text-sm">
                  運送会社が登録されていません
                </td>
              </tr>
            ) : carriers.map((carrier) => (
              <tr key={carrier.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-5 py-4 font-semibold">{carrier.companyName}</td>
                <td className="px-5 py-4 text-muted-foreground">{carrier.contactName || '—'}</td>
                <td className="px-5 py-4 text-muted-foreground">{carrier.phone || '—'}</td>
                <td className="px-5 py-4">{carrier.serviceAreas || '—'}</td>
                <td className="px-5 py-4 text-muted-foreground text-xs">{carrier.vehicleTypes || '—'}</td>
                <td className="px-5 py-4 text-right">
                  {carrier.rating ? (
                    <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {carrier.rating.toFixed(1)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-5 py-4 text-right font-medium">{carrier.totalOrders ?? 0}件</td>
                <td className="px-5 py-4 text-right text-muted-foreground">
                  {carrier.onTimeRate ? `${carrier.onTimeRate}%` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
