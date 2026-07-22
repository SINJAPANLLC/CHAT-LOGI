import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useGetMe, useLogout } from '@workspace/api-client-react';
import { PanelLeft, Plus, Clock, LayoutDashboard, LogOut, LogIn, UserPlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UserLayout({ children }: { children: React.ReactNode }) {
  const hasToken = !!localStorage.getItem('sinjapan_auth_token');
  const { data: user } = useGetMe();
  const logout = useLogout();
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('sinjapan_auth_token');
    logout.mutate(undefined, { onSuccess: () => setLocation('/login') });
    setOpen(false);
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full py-4 px-3">
      {/* Logo */}
      <div className="flex items-center justify-between mb-6 px-2">
        <Link href="/" onClick={() => setOpen(false)}>
          <img src="/logo.jpg" alt="Chat LOGI" className="h-6 w-auto" />
        </Link>
        {/* Close button (mobile only) */}
        <button
          className="md:hidden text-muted-foreground hover:text-foreground"
          onClick={() => setOpen(false)}
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* New chat */}
      {user && (
        <Link href="/" onClick={() => setOpen(false)}>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground hover:bg-muted transition-colors mb-1">
            <Plus className="h-4 w-4 shrink-0" />
            新規配送
          </button>
        </Link>
      )}

      {/* Nav links */}
      <nav className="flex-1 space-y-0.5">
        {user && (
          <Link href="/history" onClick={() => setOpen(false)}>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <Clock className="h-4 w-4 shrink-0" />
              履歴
            </button>
          </Link>
        )}
        {user?.role === 'admin' && (
          <Link href="/admin" onClick={() => setOpen(false)}>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              <LayoutDashboard className="h-4 w-4 shrink-0" />
              管理者
            </button>
          </Link>
        )}
      </nav>

      {/* Bottom: user / login */}
      <div className="border-t border-border pt-3 mt-3 space-y-1">
        {user ? (
          <>
            <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user.email}</p>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              ログアウト
            </button>
          </>
        ) : !hasToken ? (
          <>
            <Link href="/login" onClick={() => setOpen(false)}>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
                <LogIn className="h-4 w-4 shrink-0" />
                ログイン
              </button>
            </Link>
            <Link href="/register" onClick={() => setOpen(false)}>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-foreground bg-muted hover:bg-muted/80 transition-colors">
                <UserPlus className="h-4 w-4 shrink-0" />
                新規登録
              </button>
            </Link>
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] flex bg-background font-sans text-foreground">

      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-60 border-r border-border/60 shrink-0 sticky top-0 h-[100dvh]">
        <Sidebar />
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="w-64 bg-background border-r border-border h-full shadow-xl">
            <Sidebar />
          </div>
          <div className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="md:hidden flex items-center h-12 px-4 border-b border-border/50">
          <button
            onClick={() => setOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
          <Link href="/" className="mx-auto">
            <img src="/logo.jpg" alt="Chat LOGI" className="h-5 w-auto" />
          </Link>
        </div>

        <main className="flex-1 flex flex-col">
          {children}
        </main>

        <footer className="border-t border-border py-6 mt-auto">
          <div className="text-center text-sm text-muted-foreground">
            <p>© {new Date().getFullYear()} Chat LOGI. All rights reserved.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
