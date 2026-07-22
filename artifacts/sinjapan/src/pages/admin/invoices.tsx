import React, { useEffect, useState } from 'react';
import { FileText, Play, CheckCircle, Send } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react/custom-fetch';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:   { label: '下書き',   cls: 'bg-muted text-muted-foreground' },
  sent:    { label: '送付済み', cls: 'bg-blue-100 text-blue-700' },
  paid:    { label: '入金済み', cls: 'bg-green-100 text-green-700' },
  overdue: { label: '期限超過', cls: 'bg-red-100 text-red-700' },
};

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [genYear, setGenYear] = useState(new Date().getFullYear());
  const [genMonth, setGenMonth] = useState(new Date().getMonth() + 1);
  const [genResult, setGenResult] = useState<string | null>(null);

  const reload = () => {
    setLoading(true);
    customFetch<any[]>('/api/admin/invoices').then(setInvoices).finally(() => setLoading(false));
  };

  useEffect(() => { reload(); }, []);

  const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

  const generate = async () => {
    setGenerating(true); setGenResult(null);
    try {
      const res = await customFetch<{ message: string }>('/api/admin/invoices/generate', {
        method: 'POST',
        body: JSON.stringify({ year: genYear, month: genMonth }),
      });
      setGenResult(res.message);
      reload();
    } catch (e: any) {
      setGenResult(`エラー: ${e.message}`);
    } finally {
      setGenerating(false); }
  };

  const invoiceAction = async (id: number, action: 'send' | 'paid') => {
    setActionLoading(id);
    try {
      await customFetch(`/api/admin/invoices/${id}/${action}`, { method: 'PATCH', body: JSON.stringify({}) });
      reload();
    } finally { setActionLoading(null); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6" />
        <h1 className="text-2xl font-bold tracking-tight">請求書管理</h1>
      </div>

      <div className="rounded-xl border border-border p-5 space-y-4">
        <p className="font-semibold text-sm">月次請求書を生成</p>
        <div className="flex items-center gap-2">
          <select value={genYear} onChange={e => setGenYear(Number(e.target.value))}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none">
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={genMonth} onChange={e => setGenMonth(Number(e.target.value))}
            className="px-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none">
            {Array.from({ length: 12 }, (_, i) => i + 1).map(m => <option key={m} value={m}>{m}月</option>)}
          </select>
          <button onClick={generate} disabled={generating}
            className="flex items-center gap-1.5 px-4 py-2 bg-foreground text-background text-sm rounded-lg hover:opacity-90 disabled:opacity-40">
            <Play className="h-4 w-4" />{generating ? '生成中…' : '生成する'}
          </button>
        </div>
        {genResult && <p className="text-sm text-muted-foreground">{genResult}</p>}
      </div>

      {invoices.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">請求書はまだありません</div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {invoices.map(inv => {
            const st = STATUS[inv.status] ?? STATUS.draft;
            const isLoading = actionLoading === inv.id;
            return (
              <div key={inv.id} className="flex items-center px-5 py-4 gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {inv.companyName ?? inv.userName} · {inv.periodStart} 〜 {inv.periodEnd}
                    {inv.dueDate && <span className="ml-2">期限: {inv.dueDate}</span>}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                <span className="font-bold text-sm">{fmt(inv.totalAmount)}</span>
                <div className="flex gap-2">
                  {inv.status === 'draft' && (
                    <button disabled={isLoading} onClick={() => invoiceAction(inv.id, 'send')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-muted disabled:opacity-40">
                      <Send className="h-3 w-3" />送付済みに
                    </button>
                  )}
                  {(inv.status === 'sent' || inv.status === 'overdue') && (
                    <button disabled={isLoading} onClick={() => invoiceAction(inv.id, 'paid')}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40">
                      <CheckCircle className="h-3 w-3" />入金済みに
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
