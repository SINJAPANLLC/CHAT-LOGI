import React from 'react';
import { useListUsers } from '@workspace/api-client-react';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Input } from '@/components/ui/input';

export default function AdminCustomers() {
  const { data: users, isLoading } = useListUsers();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold tracking-tight">顧客管理</h1>
      </div>

      <div className="flex mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="名前・会社名・メールアドレスで検索..." className="pl-9 bg-card" />
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground bg-muted/30 border-b border-border">
              <tr>
                <th className="px-6 py-4 font-medium">ID</th>
                <th className="px-6 py-4 font-medium">会社名 / 氏名</th>
                <th className="px-6 py-4 font-medium">連絡先</th>
                <th className="px-6 py-4 font-medium">登録日</th>
                <th className="px-6 py-4 font-medium">権限</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </td>
                </tr>
              ) : users?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">
                    顧客が見つかりません
                  </td>
                </tr>
              ) : (
                users?.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 font-medium">#{user.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium">{user.companyName || '-'}</div>
                      <div className="text-muted-foreground mt-0.5">{user.name}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{user.email}</div>
                      <div className="text-muted-foreground mt-0.5">{user.phone || '-'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {format(new Date(user.createdAt), 'yyyy/MM/dd')}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                        {user.role === 'admin' ? '管理者' : '一般'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
