import React from 'react';
import { useGetDashboardStats, useGetDashboardKpi } from '@workspace/api-client-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: kpi, isLoading: kpiLoading } = useGetDashboardKpi();

  if (statsLoading || kpiLoading || !stats || !kpi) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const formatPrice = (val: number) => new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY', maximumFractionDigits: 0 }).format(val);
  const formatPercent = (val: number) => `${val.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">ダッシュボード</h1>
      </div>

      {/* Primary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">本日の相談件数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayConsultations}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未対応の見積もり</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.pendingQuotes}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">進行中の案件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.inProgress}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm bg-primary text-primary-foreground">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/80">本日の受注数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.approvedToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Financials */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">総売上</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">粗利益</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPrice(stats.grossProfit)}</div>
          </CardContent>
        </Card>
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">平均利益率</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercent(stats.avgProfitRate)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">案件ステータス</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.statusBreakdown || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="status" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'hsl(var(--muted))'}}
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} 
                />
                <Bar dataKey="count" fill="hsl(var(--foreground))" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">KPI指標</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <span className="text-sm font-medium text-muted-foreground">相談→見積提示 平均時間</span>
                <span className="font-bold">{kpi.avgConsultationToQuote} 分</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <span className="text-sm font-medium text-muted-foreground">見積成約率</span>
                <span className="font-bold">{formatPercent(kpi.quoteApprovalRate)}</span>
              </div>
              <div className="flex justify-between items-center border-b border-border/50 pb-3">
                <span className="text-sm font-medium text-muted-foreground">手配成功率</span>
                <span className="font-bold">{formatPercent(kpi.dispatchSuccessRate)}</span>
              </div>
              <div className="flex justify-between items-center pb-3">
                <span className="text-sm font-medium text-muted-foreground">リピート率</span>
                <span className="font-bold">{formatPercent(kpi.repeatRate)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
