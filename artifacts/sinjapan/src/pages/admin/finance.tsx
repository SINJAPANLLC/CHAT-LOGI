import React from 'react';
import { Construction } from 'lucide-react';

export default function AdminFinance() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">PL / BS / CF</h1>
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Construction className="h-10 w-10" />
        <p className="text-sm">財務レポート機能は準備中です</p>
      </div>
    </div>
  );
}
