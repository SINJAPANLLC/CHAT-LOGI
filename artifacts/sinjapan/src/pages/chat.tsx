import React, { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useListConversations, useSendMessage, useGetShipment, getGetShipmentQueryKey, getListConversationsQueryKey } from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowUp, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function Chat() {
  const [, params] = useRoute('/chat/:id');
  const shipmentId = Number(params?.id);
  const [, setLocation] = useLocation();

  const [message, setMessage] = useState('');
  
  // Use polling for conversations
  const { data: conversations, refetch } = useListConversations(shipmentId, {
    query: {
      enabled: !!shipmentId,
      queryKey: getListConversationsQueryKey(shipmentId),
      refetchInterval: 2000 // Poll every 2 seconds
    }
  });

  const { data: shipment } = useGetShipment(shipmentId, {
    query: {
      enabled: !!shipmentId,
      queryKey: getGetShipmentQueryKey(shipmentId),
      refetchInterval: 2000
    }
  });

  const sendMessage = useSendMessage();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversations, sendMessage.isPending]);

  // Navigate to proposal if shipment status changes
  useEffect(() => {
    if (shipment?.status === '見積提示' || shipment?.status === '顧客承認' || shipment?.status === '手配中') {
      setLocation(`/proposal/${shipmentId}`);
    }
  }, [shipment?.status, shipmentId, setLocation]);

  const handleSend = async () => {
    if (!message.trim() || !shipmentId) return;

    const currentMessage = message;
    setMessage('');

    try {
      const res = await sendMessage.mutateAsync({
        id: shipmentId,
        data: { message: currentMessage }
      });

      await refetch();

      if (res.isComplete) {
        setLocation(`/proposal/${shipmentId}`);
      }
    } catch (err) {
      // Revert if error
      setMessage(currentMessage);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full h-[calc(100vh-16rem)]">
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-6"
      >
        {conversations?.map((msg) => (
          <div 
            key={msg.id}
            className={cn(
              "flex w-full",
              msg.sender === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div className={cn(
              "max-w-[80%] rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed",
              msg.sender === 'user' 
                ? "bg-primary text-primary-foreground rounded-tr-sm" 
                : "bg-muted text-foreground rounded-tl-sm"
            )}>
              {msg.message}
            </div>
          </div>
        ))}
        
        {sendMessage.isPending && (
          <div className="flex w-full justify-start">
            <div className="max-w-[80%] rounded-2xl px-5 py-3.5 bg-muted text-foreground rounded-tl-sm flex items-center gap-2">
              <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
              <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
              <span className="h-1.5 w-1.5 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              <span className="ml-2 text-sm text-muted-foreground">Chat LOGIが考慮中...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border bg-background">
        <div className="relative flex items-center">
          <Textarea 
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力..."
            className="w-full min-h-[52px] max-h-32 py-3 pr-14 bg-muted/50 border-transparent focus-visible:ring-0 focus-visible:bg-transparent focus-visible:border-border resize-none rounded-xl"
            disabled={sendMessage.isPending}
          />
          <Button 
            size="icon"
            className="absolute right-2 h-8 w-8 rounded-full"
            disabled={!message.trim() || sendMessage.isPending}
            onClick={handleSend}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-xs text-muted-foreground">
            Chat LOGIが最適な配送プランをご提案します。
          </span>
        </div>
      </div>
    </div>
  );
}
