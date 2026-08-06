import React, { useState, useMemo } from 'react';
import { useListCarriers, useCreateCarrier, useUpdateCarrier } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Pencil, Search, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

type FormData = typeof EMPTY;

function CarrierForm({
  data,
  onChange,
  onSubmit,
  onCancel,
  isPending,
  submitLabel,
}: {
  data: FormData;
  onChange: (key: string, val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  isPending: boolean;
  submitLabel: string;
}) {
  return (
    <>
      <div className="grid gap-4 py-4">
        {FIELDS.map(({ label, key, placeholder }) => (
          <div key={key} className="space-y-1.5">
            <Label className="text-sm">{label}</Label>
            <Input
              value={(data as any)[key]}
              onChange={e => onChange(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}
        <div className="space-y-1.5">
          <Label className="text-sm">Memo</Label>
          <Textarea
            value={data.notes}
            onChange={e => onChange('notes', e.target.value)}
            placeholder="社内メモ"
            className="min-h-[72px]"
          />
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>キャンセル</Button>
        <Button onClick={onSubmit} disabled={isPending || !data.companyName}>
          {isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          {submitLabel}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function AdminCarriers() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: carriers, isLoading } = useListCarriers();
  const createCarrier = useCreateCarrier();
  const updateCarrier = useUpdateCarrier();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editCarrier, setEditCarrier] = useState<any | null>(null);
  const [addForm, setAddForm] = useState<FormData>({ ...EMPTY });
  const [editForm, setEditForm] = useState<FormData>({ ...EMPTY });
  const [searchName, setSearchName] = useState('');
  const [searchArea, setSearchArea] = useState('');

  const filtered = useMemo(() => {
    if (!carriers) return [];
    return carriers.filter((c: any) => {
      const nameOk = !searchName || c.companyName?.includes(searchName);
      const areaOk = !searchArea || c.serviceAreas?.includes(searchArea);
      return nameOk && areaOk;
    });
  }, [carriers, searchName, searchArea]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['/api/carriers'] });

  const setAdd = (k: string, v: string) => setAddForm(p => ({ ...p, [k]: v }));
  const setEdit = (k: string, v: string) => setEditForm(p => ({ ...p, [k]: v }));

  const handleCreate = async () => {
    try {
      await createCarrier.mutateAsync({ data: addForm as any });
      setIsAddOpen(false);
      setAddForm({ ...EMPTY });
      invalidate();
      toast({ title: '登録しました' });
    } catch {
      toast({ title: '登録に失敗しました', variant: 'destructive' });
    }
  };

  const openEdit = (c: any) => {
    setEditCarrier(c);
    setEditForm({
      companyName: c.companyName ?? '',
      contactName: c.contactName ?? '',
      phone: c.phone ?? '',
      fax: c.fax ?? '',
      serviceAreas: c.serviceAreas ?? '',
      vehicleTypes: c.vehicleTypes ?? '',
      bankAccount: c.bankAccount ?? '',
      paymentTerms: c.paymentTerms ?? '',
      notes: c.notes ?? '',
    });
  };

  const handleUpdate = async () => {
    if (!editCarrier) return;
    try {
      await updateCarrier.mutateAsync({ id: editCarrier.id, data: editForm as any });
      setEditCarrier(null);
      invalidate();
      toast({ title: '更新しました' });
    } catch {
      toast({ title: '更新に失敗しました', variant: 'destructive' });
    }
  };

  const HEADERS = ['会社名', '担当者', '電話', 'FAX', '対応エリア', '保有車両', '振込先', '支払いサイト', 'Memo', ''];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">運送会社管理</h1>
        <Button className="gap-2" onClick={() => { setAddForm({ ...EMPTY }); setIsAddOpen(true); }}>
          <Plus className="h-4 w-4" />新規登録
        </Button>
      </div>

      {/* 新規登録ダイアログ */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>運送会社の登録</DialogTitle></DialogHeader>
          <CarrierForm
            data={addForm}
            onChange={setAdd}
            onSubmit={handleCreate}
            onCancel={() => setIsAddOpen(false)}
            isPending={createCarrier.isPending}
            submitLabel="登録する"
          />
        </DialogContent>
      </Dialog>

      {/* 編集ダイアログ */}
      <Dialog open={!!editCarrier} onOpenChange={open => { if (!open) setEditCarrier(null); }}>
        <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editCarrier?.companyName} を編集</DialogTitle></DialogHeader>
          <CarrierForm
            data={editForm}
            onChange={setEdit}
            onSubmit={handleUpdate}
            onCancel={() => setEditCarrier(null)}
            isPending={updateCarrier.isPending}
            submitLabel="保存する"
          />
        </DialogContent>
      </Dialog>

      {/* 検索バー */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchName}
            onChange={e => setSearchName(e.target.value)}
            placeholder="会社名で検索"
            className="pl-9 pr-8"
          />
          {searchName && (
            <button onClick={() => setSearchName('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            value={searchArea}
            onChange={e => setSearchArea(e.target.value)}
            placeholder="エリアで検索（例：関東、大阪）"
            className="pl-9 pr-8"
          />
          {searchArea && (
            <button onClick={() => setSearchArea('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {(searchName || searchArea) && (
          <p className="text-sm text-muted-foreground self-center">{filtered.length} 件</p>
        )}
      </div>

      <div className="rounded-xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm min-w-[900px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {HEADERS.map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {isLoading ? (
              <tr>
                <td colSpan={HEADERS.length} className="py-16 text-center">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto" />
                </td>
              </tr>
            ) : !filtered.length ? (
              <tr>
                <td colSpan={HEADERS.length} className="py-16 text-center text-muted-foreground">
                  {carriers?.length ? '条件に一致する運送会社がありません' : '運送会社が登録されていません'}
                </td>
              </tr>
            ) : filtered.map((c: any) => (
              <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3.5 font-semibold whitespace-nowrap">{c.companyName}</td>
                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.contactName || '—'}</td>
                <td className="px-4 py-3.5 whitespace-nowrap">{c.phone || '—'}</td>
                <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{c.fax || '—'}</td>
                <td className="px-4 py-3.5">{c.serviceAreas || '—'}</td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground">{c.vehicleTypes || '—'}</td>
                <td className="px-4 py-3.5 text-xs">{c.bankAccount || '—'}</td>
                <td className="px-4 py-3.5 text-xs whitespace-nowrap">{c.paymentTerms || '—'}</td>
                <td className="px-4 py-3.5 text-xs text-muted-foreground max-w-[160px] truncate">{c.notes || '—'}</td>
                <td className="px-4 py-3.5">
                  <button
                    onClick={() => openEdit(c)}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
