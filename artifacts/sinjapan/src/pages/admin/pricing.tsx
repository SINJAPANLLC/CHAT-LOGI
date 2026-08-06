import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, RotateCcw, Info } from 'lucide-react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

function apiFetch(path: string, opts?: RequestInit) {
  const token = localStorage.getItem('sinjapan_auth_token');
  return fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...opts?.headers },
  }).then(async r => { if (!r.ok) throw new Error(await r.text()); return r.json(); });
}

export default function AdminAiPrompt() {
  const { toast } = useToast();
  const [prompt, setPrompt] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    apiFetch('/api/admin/ai-prompt')
      .then(d => { setPrompt(d.prompt); setOriginal(d.prompt); })
      .catch(() => toast({ variant: 'destructive', title: '読み込みに失敗しました' }))
      .finally(() => setLoading(false));
  }, []);

  // textarea の高さを内容に合わせて自動調整
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [prompt]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch('/api/admin/ai-prompt', { method: 'PUT', body: JSON.stringify({ prompt }) });
      setOriginal(prompt);
      toast({ title: 'プロンプトを保存しました' });
    } catch {
      toast({ variant: 'destructive', title: '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('変更を破棄して元に戻しますか？')) return;
    setPrompt(original);
  };

  const isDirty = prompt !== original;

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AIプロンプト設定</h1>
          <p className="text-sm text-muted-foreground mt-1">Chat LOGIのAIアシスタントへの指示内容を編集できます</p>
        </div>
        <div className="flex gap-2">
          {isDirty && (
            <Button variant="outline" onClick={handleReset} className="gap-1.5 text-sm">
              <RotateCcw className="h-3.5 w-3.5" />
              元に戻す
            </Button>
          )}
          <Button onClick={handleSave} disabled={saving || !isDirty} className="gap-1.5 text-sm">
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            保存する
          </Button>
        </div>
      </div>

      {/* プレースホルダー説明 */}
      <div className="flex gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3">
        <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        <div className="text-xs text-muted-foreground leading-relaxed space-y-0.5">
          <p>プロンプト内で使える動的プレースホルダー：</p>
          <p>
            <code className="bg-background border border-border rounded px-1 py-0.5 font-mono">{'{DATE}'}</code>　今日の日付（例: 2026-08-06）
            　
            <code className="bg-background border border-border rounded px-1 py-0.5 font-mono">{'{WEEKDAY}'}</code>　曜日（例: 水）
            　
            <code className="bg-background border border-border rounded px-1 py-0.5 font-mono">{'{TOMORROW}'}</code>　明日の日付
          </p>
        </div>
      </div>

      {/* テキストエリア */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            className="w-full min-h-[600px] rounded-xl border border-border bg-card px-5 py-4 text-sm font-mono leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-foreground/20 transition-shadow"
            placeholder="システムプロンプトを入力..."
            spellCheck={false}
          />
          <div className="absolute bottom-3 right-4 text-xs text-muted-foreground tabular-nums">
            {prompt.length.toLocaleString()} 文字
          </div>
        </div>
      )}

      {/* 変更ありインジケーター */}
      {isDirty && (
        <p className="text-xs text-amber-600">未保存の変更があります</p>
      )}
    </div>
  );
}
