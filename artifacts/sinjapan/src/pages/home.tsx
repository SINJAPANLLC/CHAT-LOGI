import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useStartAiChat, useGetMe } from '@workspace/api-client-react';
import { Loader2, Mic, Plus, ArrowUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DRAFT_KEY = 'sinjapan_draft_message';

const EXAMPLES = [
  "明日の午後、東京から大阪までパレットを20枚運びたい。"
];

export default function Home() {
  const [text, setText] = useState(() => localStorage.getItem(DRAFT_KEY) || '');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: user } = useGetMe();
  const startAiChat = useStartAiChat();
  const isSubmitting = startAiChat.isPending;

  useEffect(() => {
    if (user) localStorage.removeItem(DRAFT_KEY);
  }, [user]);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [text]);

  const handleSubmit = async () => {
    if (!text.trim() || isSubmitting) return;

    if (!user) {
      localStorage.setItem(DRAFT_KEY, text);
      setLocation('/login');
      return;
    }

    try {
      const chatRes = await startAiChat.mutateAsync({ data: { message: text } });
      localStorage.removeItem(DRAFT_KEY);
      setLocation(`/chat/${chatRes.shipmentId}`);
    } catch {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "申し訳ありません。エラーが発生しました。もう一度お試しください。"
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-8 max-w-3xl mx-auto w-full">

      {/* Greeting */}
      <h1 className="text-3xl md:text-4xl font-semibold text-foreground mb-10 tracking-tight">
        今日は何を運びましょうか？
      </h1>

      {/* ChatGPT-style input box */}
      <div className="w-full">
        <div className="relative bg-muted rounded-2xl border border-border/60 shadow-sm hover:border-border transition-colors focus-within:border-border/80">
          {/* Top row: textarea */}
          <div className="flex items-start gap-3 px-4 pt-4 pb-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="配送の内容を入力してください"
              rows={1}
              disabled={isSubmitting}
              className="flex-1 bg-transparent outline-none resize-none text-base text-foreground placeholder:text-muted-foreground leading-relaxed min-h-[28px] max-h-[200px] disabled:opacity-50"
            />
          </div>

          {/* Bottom row: actions */}
          <div className="flex items-center justify-between px-3 pb-3">
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
                disabled={isSubmitting}
              >
                <Plus className="h-5 w-5" />
              </button>
              <button
                type="button"
                className="w-9 h-9 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors"
                disabled={isSubmitting}
              >
                <Mic className="h-5 w-5" />
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!text.trim() || isSubmitting}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-foreground text-background disabled:bg-muted-foreground/30 disabled:text-muted-foreground transition-colors hover:opacity-90"
            >
              {isSubmitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowUp className="h-4 w-4" />
              }
            </button>
          </div>
        </div>

        {/* Example chips */}
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {EXAMPLES.map((example, i) => (
            <button
              key={i}
              onClick={() => { setText(example); textareaRef.current?.focus(); }}
              className="px-4 py-2 rounded-full border border-border/60 text-sm text-muted-foreground hover:bg-muted hover:text-foreground hover:border-border transition-all duration-150"
              disabled={isSubmitting}
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
