import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { FileText, ChevronRight, AlertCircle } from 'lucide-react';
import { customFetch } from '@workspace/api-client-react/custom-fetch';

const STATUS: Record<string, { label: string; cls: string }> = {
  draft:   { label: '下書き', cls: 'bg-muted text-muted-foreground' },
  sent:    { label: '送付済み', cls: 'bg-blue-100 text-blue-700' },
  paid:    { label: '入金済み', cls: 'bg-green-100 text-green-700' },
  overdue: { label: '期限超過', cls: 'bg-red-100 text-red-700' },
};

export default function Invoices() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    customFetch<any[]>('/api/invoices')
      .then(setInvoices)
      .catch(() => setError('請求書の取得に失敗しました'))
      .finally(() => setLoading(false));
  }, []);

  const fmt = (n: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }).format(n);

  if (loading) return <div className="flex-1 flex items-center justify-center"><div className="h-8 w-8 border-2 border-foreground border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="flex-1 p-4 md:p-8 flex justify-center items-start">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6" />
          <h1 className="text-2xl font-bold tracking-tight">請求書</h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <AlertCircle className="h-4 w-4" />{error}
          </div>
        )}

        {invoices.length === 0 && !error ? (
          <div className="rounded-xl border border-border/50 bg-muted/20 px-6 py-12 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">請求書はまだありません</p>
          </div>
        ) : (
          <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
            {invoices.map(inv => {
              const st = STATUS[inv.status] ?? { label: inv.status, cls: 'bg-muted text-muted-foreground' };
              return (
                <Link key={inv.id} href={`/invoices/${inv.id}`}>
                  <div className="flex items-center px-5 py-4 hover:bg-muted/30 transition-colors cursor-pointer">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{inv.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.periodStart} 〜 {inv.periodEnd}
                        {inv.dueDate && <span className="ml-2">支払期限: {inv.dueDate}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                      <span className="font-bold text-sm">{fmt(inv.totalAmount)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
