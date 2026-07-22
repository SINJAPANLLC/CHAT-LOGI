import React, { useState } from 'react';
import { useGetMe, useUpdateMe } from '@workspace/api-client-react';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const { data: user, refetch } = useGetMe();
  const updateMe = useUpdateMe();
  const { toast } = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Sync name when user loads
  React.useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user?.name]);

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMe.mutateAsync({ data: { name } });
      await refetch();
      toast({ title: '保存しました' });
    } catch {
      toast({ title: '保存に失敗しました', variant: 'destructive' });
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: '新しいパスワードが一致しません', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 8) {
      toast({ title: 'パスワードは8文字以上にしてください', variant: 'destructive' });
      return;
    }
    try {
      await updateMe.mutateAsync({ data: { currentPassword, newPassword } });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'パスワードを変更しました' });
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'パスワードの変更に失敗しました';
      toast({ title: msg, variant: 'destructive' });
    }
  };

  return (
    <div className="max-w-xl mx-auto w-full px-4 py-10 space-y-10">
      <h1 className="text-xl font-semibold">設定</h1>

      {/* Profile */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">プロフィール</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">名前</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="山田 太郎"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">メールアドレス</label>
            <input
              type="email"
              value={user?.email ?? ''}
              disabled
              className="w-full rounded-lg border border-border bg-muted px-3 py-2 text-sm text-muted-foreground cursor-not-allowed"
            />
          </div>
          <button
            type="submit"
            disabled={updateMe.isPending}
            className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {updateMe.isPending ? '保存中…' : '保存'}
          </button>
        </form>
      </section>

      <div className="border-t border-border" />

      {/* Password */}
      <section className="space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">パスワード変更</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">現在のパスワード</label>
            <input
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">新しいパスワード</label>
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">新しいパスワード（確認）</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={updateMe.isPending || !currentPassword || !newPassword || !confirmPassword}
            className="px-5 py-2 rounded-full bg-foreground text-background text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {updateMe.isPending ? '変更中…' : 'パスワードを変更'}
          </button>
        </form>
      </section>
    </div>
  );
}
