import React from 'react';
import { Link, useLocation } from 'wouter';
import { useGetMe, useLogout } from '@workspace/api-client-react';
import { Bell, LogOut, PackagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UserLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useGetMe();
  const logout = useLogout();
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => setLocation('/login')
    });
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background font-sans text-foreground">
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-bold tracking-tight text-xl">
            SINJAPAN
          </Link>

          <div className="flex items-center gap-4">
            {!isLoading && user ? (
              <>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
                  <Bell className="h-5 w-5" />
                </Button>
                <Link href="/" className="hidden sm:flex">
                  <Button variant="outline" className="gap-2 rounded-full border-border">
                    <PackagePlus className="h-4 w-4" />
                    <span className="font-medium">新規配送</span>
                  </Button>
                </Link>
                <div className="flex items-center gap-3 border-l border-border pl-4 ml-2">
                  <Link href="/history" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                    履歴
                  </Link>
                  {user.role === 'admin' && (
                    <Link href="/admin" className="text-sm font-medium text-primary hover:underline">
                      管理者
                    </Link>
                  )}
                  <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </>
            ) : !isLoading ? (
              <div className="flex items-center gap-2">
                <Link href="/login">
                  <Button variant="ghost">ログイン</Button>
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col">
        {children}
      </main>

      <footer className="border-t border-border py-8 md:py-12 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} SINJAPAN. All rights reserved.</p>
          <p className="mt-2 text-xs">物流は、考えなくていい。</p>
        </div>
      </footer>
    </div>
  );
}
