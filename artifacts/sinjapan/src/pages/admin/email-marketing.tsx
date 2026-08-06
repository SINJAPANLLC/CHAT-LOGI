import React, { useState } from 'react';
import { useListUsers } from '@workspace/api-client-react';
import { Mail, Send, Users, User, Plus, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('sinjapan_auth_token');
  return fetch(path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); });
}

const TEMPLATES = [
  { label: '新規ご挨拶',    subject: '【Chat LOGI】はじめまして',               body: 'はじめまして。Chat LOGI（チャットロジ）でございます。\n\n弊社はAIを活用した物流マッチングサービスを提供しております。\nこの度はご縁をいただき、ご連絡させていただきました。\n\nぜひ一度、サービスの詳細についてご説明の機会をいただけますと幸いです。\n\nどうぞよろしくお願いいたします。' },
  { label: 'サービス案内',  subject: '【Chat LOGI】物流コスト削減のご提案',       body: 'お世話になっております。Chat LOGIでございます。\n\n弊社のAI物流マッチングサービスにより、配送コストの削減と業務効率化を実現されているお客様が増えております。\n\n・AIによる最適ルート提案\n・リアルタイムの配送状況確認\n・一元管理でペーパーレス化\n\n無料でお試しいただけますので、お気軽にお問い合わせください。' },
  { label: 'フォロー',      subject: '【Chat LOGI】その後いかがでしょうか',       body: 'いつもお世話になっております。Chat LOGIでございます。\n\n先日はお時間をいただきありがとうございました。\nその後、弊社サービスについてご検討はいかがでしょうか。\n\nご不明な点やご質問がございましたら、お気軽にご連絡ください。\n\n引き続きよろしくお願いいたします。' },
  { label: 'カスタム',      subject: '',                                         body: '' },
];

type Target = 'all' | 'select' | 'manual';

export default function EmailMarketing() {
  const { toast } = useToast();
  const { data: usersData } = useListUsers();
  const users = (usersData as any)?.users ?? [];

  const [template, setTemplate] = useState(0);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [target, setTarget] = useState<Target>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [manualEmails, setManualEmails] = useState('');
  const [sending, setSending] = useState(false);

  const applyTemplate = (idx: number) => {
    setTemplate(idx);
    setSubject(TEMPLATES[idx].subject);
    setBody(TEMPLATES[idx].body);
  };

  const toggleUser = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) { toast({ title: '件名と本文を入力してください', variant: 'destructive' }); return; }
    setSending(true);
    try {
      let emails: string[] = [];
      if (target === 'all') {
        emails = users.map((u: any) => u.email).filter(Boolean);
      } else if (target === 'select') {
        emails = users.filter((u: any) => selectedIds.includes(u.id)).map((u: any) => u.email).filter(Boolean);
      } else {
        emails = manualEmails.split(/[\n,]/).map(e => e.trim()).filter(Boolean);
      }
      if (emails.length === 0) { toast({ title: '送信先を指定してください', variant: 'destructive' }); setSending(false); return; }
      await apiFetch('/api/notifications/send', {
        method: 'POST',
        body: JSON.stringify({ subject, body, emails }),
      });
      toast({ title: `${emails.length}件に送信しました` });
      setSubject(''); setBody(''); setTemplate(0); setSelectedIds([]); setManualEmails('');
    } catch {
      toast({ title: '送信中にエラーが発生しました', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">メール営業</h1>
        <p className="text-muted-foreground mt-1 text-sm">ユーザーまたは外部アドレスへ営業メールを一括送信します。</p>
      </div>

      {/* テンプレート */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">テンプレート</Label>
        <div className="flex flex-wrap gap-2">
          {TEMPLATES.map((t, i) => (
            <button
              key={i}
              onClick={() => applyTemplate(i)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${template === i ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 件名・本文 */}
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>件名</Label>
          <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="メールの件名" />
        </div>
        <div className="space-y-1.5">
          <Label>本文</Label>
          <Textarea value={body} onChange={e => setBody(e.target.value)} placeholder="メール本文を入力してください" className="min-h-[200px] resize-none" />
        </div>
      </div>

      {/* 送信対象 */}
      <div className="space-y-3">
        <Label className="text-sm font-semibold">送信対象</Label>
        <div className="flex flex-wrap gap-2">
          {([['all', '全ユーザー', <Users className="h-3.5 w-3.5" />], ['select', 'ユーザーを選択', <User className="h-3.5 w-3.5" />], ['manual', 'メールアドレスを入力', <Mail className="h-3.5 w-3.5" />]] as const).map(([v, l, icon]) => (
            <button
              key={v}
              onClick={() => setTarget(v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${target === v ? 'bg-foreground text-background border-foreground' : 'border-border hover:bg-muted'}`}
            >
              {icon}{l}
            </button>
          ))}
        </div>

        {target === 'select' && (
          <div className="border border-border rounded-xl divide-y divide-border/50 max-h-64 overflow-y-auto">
            {users.map((u: any) => (
              <label key={u.id} className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/40">
                <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleUser(u.id)} className="accent-foreground" />
                <span className="text-sm flex-1">{u.name ?? u.email}</span>
                <span className="text-xs text-muted-foreground">{u.email}</span>
              </label>
            ))}
          </div>
        )}

        {target === 'manual' && (
          <div className="space-y-1.5">
            <Label>メールアドレス（カンマまたは改行区切り）</Label>
            <Textarea value={manualEmails} onChange={e => setManualEmails(e.target.value)} placeholder="example@domain.com, another@domain.com" className="min-h-[100px] resize-none" />
          </div>
        )}

        {target === 'all' && (
          <p className="text-xs text-muted-foreground">{users.length} 件のユーザーに送信されます</p>
        )}
        {target === 'select' && selectedIds.length > 0 && (
          <p className="text-xs text-muted-foreground">{selectedIds.length} 件に送信されます</p>
        )}
      </div>

      <Button onClick={handleSend} disabled={sending} className="bg-black text-white hover:bg-black/90">
        {sending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />送信中…</> : <><Send className="h-4 w-4 mr-2" />送信する</>}
      </Button>
    </div>
  );
}
