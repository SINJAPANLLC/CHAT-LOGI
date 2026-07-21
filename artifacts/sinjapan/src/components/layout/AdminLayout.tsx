import React from 'react';
import { Link, useLocation } from 'wouter';
import { useGetMe, useLogout } from '@workspace/api-client-react';
import { LayoutDashboard, Package, Truck, Users, CircleDollarSign, LogOut, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  React.useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-sidebar">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null; // Redirecting
  }

  const handleLogout = () => {
    localStorage.removeItem('sinjapan_auth_token');
    logout.mutate(undefined, {
      onSuccess: () => setLocation('/login')
    });
  };

  const navItems = [
    { href: '/admin', label: 'ダッシュボード', icon: LayoutDashboard },
    { href: '/admin/shipments', label: '案件一覧', icon: Package },
    { href: '/admin/carriers', label: '運送会社管理', icon: Truck },
    { href: '/admin/customers', label: '顧客管理', icon: Users },
    { href: '/admin/pricing', label: '料金設定', icon: CircleDollarSign },
  ];

  return (
    <div className="min-h-[100dvh] flex bg-sidebar text-foreground font-sans">
      <aside className="w-64 border-r border-border bg-card flex flex-col hidden md:flex sticky top-0 h-[100dvh]">
        <div className="h-16 flex items-center px-6 border-b border-border/50">
          <Link href="/admin" className="font-bold tracking-tight text-xl">
            SINJAPAN <span className="text-xs font-normal text-muted-foreground ml-2">管理者</span>
          </Link>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== '/admin' && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                  isActive 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-xs text-muted-foreground hover:underline flex items-center gap-1">
              <ArrowLeft className="h-3 w-3" />
              一般画面へ
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card flex items-center px-6 md:hidden">
          <Link href="/admin" className="font-bold tracking-tight text-lg">
            SINJAPAN 管理者
          </Link>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="mx-auto max-w-6xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
