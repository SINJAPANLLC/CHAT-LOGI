import React, { useState } from 'react';
import { useListCarriers, useCreateCarrier } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

const FIELDS = [
  { label: '会社名 *', key: 'companyName', placeholder: '株式会社物流' },
  { label: '担当者名', key: 'contactName', placeholder: '佐藤 太郎' },
  { label: '電話番号', key: 'phone', placeholder: '03-0000-0000' },
  { label: 'FAX番号', key: 'fax', placeholder: '03-0000-0001' },
  { label: '対応エリア', key: 'serviceAreas', placeholder: '関東全域' },
  { label: '保有車両', key: 'vehicleTypes', placeholder: '2t, 4tウィング, 10t' },
  { label: '振込先', key: 'bankAccount', placeholder: '○○銀行 △△支店 普通 1234567' },
  { label: '支払いサイト', key: 'paymentTerms', placeholder: '月末締め翌月末払い' },
] as const;

const EMPTY = {
  companyName: '', contactName: '', phone: '', fax: '',
  serviceAreas: '', vehicleTypes: '', bankAccount: '', paymentTerms: '', notes: ''
};

export default function AdminCarriers() {
  const queryClient = useQueryClient();
  const { data: carriers, isLoading } = useListCarriers();
  const createCarrier = useCreateCarrier();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formData, setFormData] = useState<typeof EMPTY>({ ...EMPTY });

  const set = (key: string, val: string) => setFormData(prev => ({ ...prev, [key]: val }));

  const handleCreate = async () => {
    try {
      await createCarrier.mutateAsync({ data: formData as any });
      setIsAddOpen(false);
      setFormData({ ...EMPTY });
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
          <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>運送会社の登録</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              {FIELDS.map(({ label, key, placeholder }) => (
                <div key={key} className="space-y-1.5">
                  <Label className="text-sm">{label}</Label>
                  <Input
                    value={(formData as any)[key]}
                    onChange={e => set(key, e.target.value)}
                    placeholder={placeholder}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <Label className="text-sm">Memo</Label>
                <Textarea
                  value={formData.notes}
                  onChange={e => set('notes', e.target.value)}
                  placeholder="社内メモ"
                  className="min-h-[72px]"
                />
              </div>
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

      <div className="rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {['会社名', '担当者', '電話', 'FAX', '対応エリア', '保有車両', '振込先', '支払いサイト', '評価', 'Memo'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isLoading ? (
              <tr>
                <td colSpan={10} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </td>
              </tr>
            ) : !carriers?.length ? (
              <tr>
                <td colSpan={10} className="py-16 text-center text-muted-foreground">
                  運送会社が登録されていません
                </td>
              </tr>
            ) : carriers.map((c: any) => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3.5 font-semibold whitespace-nowrap">{c.companyName}</td>
                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.contactName || '—'}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">{c.phone || '—'}</td>
                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.fax || '—'}</td>
                <td className="px-4 py-3.5">{c.serviceAreas || '—'}</td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground">{c.vehicleTypes || '—'}</td>
                <td className="px-4 py-3.5 text-xs">{c.bankAccount || '—'}</td>
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">{c.paymentTerms || '—'}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">
                  {c.rating ? (
                    <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                      <Star className="h-3.5 w-3.5 fill-current" />{c.rating.toFixed(1)}
                    </span>
                  ) : '—'}
                </td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[160px] truncate">{c.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
