import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useCreateShipment, useStartAiChat } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const EXAMPLES = [
  "明日の午後、東京から大阪までパレット3枚を運びたいです。",
  "来週水曜、横浜の倉庫から千葉の店舗へ段ボール50箱を配送予定です。",
  "急ぎです。今日の夕方までに埼玉から川崎へ建築資材（約2t）を届けてください。"
];

export default function Home() {
  const [text, setText] = useState('');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const createShipment = useCreateShipment();
  const startAiChat = useStartAiChat();

  const isSubmitting = createShipment.isPending || startAiChat.isPending;

  const handleSubmit = async () => {
    if (!text.trim()) return;

    try {
      // 1. Create a draft shipment
      const shipment = await createShipment.mutateAsync({
        data: {
          requestText: text
        }
      });

      // 2. Start the AI chat context with the message
      const chatRes = await startAiChat.mutateAsync({
        data: {
          message: text
        }
      });

      // Navigate to chat interface
      setLocation(`/chat/${shipment.id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: "申し訳ありません。エラーが発生しました。"
      });
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-20 max-w-3xl mx-auto w-full">
      <div className="w-full text-center space-y-4 mb-16">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
          SINJAPAN
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground font-medium">
          物流は、考えなくていい。
        </p>
      </div>

      <div className="w-full space-y-6">
        <div className="relative group">
          <Textarea 
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="今日は何を運びますか？"
            className="w-full min-h-[160px] text-lg p-6 bg-transparent border-2 border-border focus-visible:ring-0 focus-visible:border-primary resize-none rounded-xl transition-colors"
            disabled={isSubmitting}
          />
          <div className="absolute bottom-4 right-4">
            <Button 
              size="lg"
              className="rounded-full px-8"
              disabled={!text.trim() || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  相談する
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="pt-8">
          <p className="text-sm text-muted-foreground mb-4 font-medium px-2">例えば、このように入力してください：</p>
          <div className="flex flex-col gap-3">
            {EXAMPLES.map((example, i) => (
              <button
                key={i}
                onClick={() => setText(example)}
                className="text-left px-4 py-3 rounded-lg border border-border/50 text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:border-border transition-all duration-200"
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
