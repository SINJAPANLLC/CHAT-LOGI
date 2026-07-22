import React from 'react';
import { useLocation, Link } from 'wouter';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useLogin, useGetMe } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const schema = z.object({
  email: z.string().email('正しいメールアドレスを入力してください'),
  password: z.string().min(6, '6文字以上で入力してください')
});

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const login = useLogin();
  
  // Check if already logged in
  const { data: user, isLoading } = useGetMe();
  
  React.useEffect(() => {
    if (!isLoading && user) {
      if (user.role === 'admin') setLocation('/admin');
      else setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' }
  });

  const onSubmit = async (data: z.infer<typeof schema>) => {
    try {
      const res = await login.mutateAsync({ data });
      // Store token for Bearer auth (cookie-independent)
      if ((res as any).token) {
        localStorage.setItem('sinjapan_auth_token', (res as any).token);
      }
      if (res.user.role === 'admin') setLocation('/admin');
      else setLocation('/');
    } catch (err) {
      toast({
        variant: "destructive",
        title: "ログイン失敗",
        description: "メールアドレスまたはパスワードが間違っています。"
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/10">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link href="/" className="inline-flex justify-center mb-2">
            <img src="/logo.jpg" alt="Chat LOGI" className="h-8 w-auto" />
          </Link>
          <h1 className="text-xl font-medium tracking-tight">ログイン</h1>
        </div>

        <div className="bg-card border border-border p-6 sm:p-8 rounded-xl shadow-sm">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>メールアドレス</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="example@sinjapan.co.jp" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>パスワード</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-3">
                <Button type="submit" className="flex-1 bg-black text-white hover:bg-black/90" disabled={login.isPending}>
                  {login.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  ログイン
                </Button>
                <Link href="/register" className="flex-1">
                  <Button type="button" variant="outline" className="w-full bg-white text-black border-black hover:bg-gray-50">
                    新規登録
                  </Button>
                </Link>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
