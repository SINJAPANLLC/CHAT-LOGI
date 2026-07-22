import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useStartAiChat, useGetMe } from '@workspace/api-client-react';
import { Loader2, Mic, Plus, Volume2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DRAFT_KEY = 'sinjapan_draft_message';

const EXAMPLES = [
  "明日の午後、東京から大阪までパレット3枚を運びたいです。",
  "来週水曜、横浜の倉庫から千葉の店舗へ段ボール50箱を配送予定です。",
  "急ぎです。今日の夕方までに埼玉から川崎へ建築資材（約2t）を届けてください。"
];

export default function Home() {
  const [text, setText] = useState(() => localStorage.getItem(DRAFT_KEY) || '');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: user } = useGetMe();
  const startAiChat = useStartAiChat();
  const isSubmitting = startAiChat.isPending;

  useEffect(() => {
    if (user) localStorage.removeItem(DRAFT_KEY);
  }, [user]);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 pb-24 max-w-3xl mx-auto w-full">

      {/* Logo */}
      <div className="mb-12 flex justify-center">
        <img src="/logo.jpg" alt="Chat LOGI" className="h-12 md:h-14 w-auto" />
      </div>

      {/* Heading */}
      <h1 className="text-2xl md:text-3xl font-normal text-foreground mb-10 tracking-tight">
        今日は何を運びましょうか？
      </h1>

      {/* Input bar */}
      <div className="w-full">
        <div
          className="flex items-center gap-2 bg-muted/60 rounded-full px-4 py-3 border border-border/40 hover:border-border transition-colors focus-within:border-border focus-within:bg-muted/80"
          onClick={() => inputRef.current?.focus()}
        >
          {/* Plus button */}
          <button
            type="button"
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
            disabled={isSubmitting}
          >
            <Plus className="h-5 w-5" />
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="配送の内容を入力してください"
            disabled={isSubmitting}
            className="flex-1 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />

          {/* Right actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            {isSubmitting ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mx-2" />
            ) : (
              <>
                <button
                  type="button"
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors"
                >
                  <Mic className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={text.trim() ? handleSubmit : undefined}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-background border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  <Volume2 className="h-4 w-4" />
                  相談する
                </button>
              </>
            )}
          </div>
        </div>

        {/* Example suggestions */}
        <div className="mt-8">
          <p className="text-xs text-muted-foreground mb-3 px-1">例えば：</p>
          <div className="flex flex-col gap-2">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => { setText(example); inputRef.current?.focus(); }}
                className="text-left px-4 py-2.5 rounded-full border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border transition-all duration-150"
                disabled={isSubmitting}
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
