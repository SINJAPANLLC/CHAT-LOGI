import React from 'react';
import { Construction } from 'lucide-react';

export default function AdminNotifications() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">通知管理</h1>
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Construction className="h-10 w-10" />
        <p className="text-sm">通知管理機能は準備中です</p>
      </div>
    </div>
  );
}
