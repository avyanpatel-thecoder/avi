import { useQueryClient } from "@tanstack/react-query";
import { useListOpenaiConversations, useCreateOpenaiConversation, useListOpenaiMessages, getListOpenaiConversationsQueryKey, getListOpenaiMessagesQueryKey, getGetOpenaiConversationQueryKey, OpenaiMessage, OpenaiConversation } from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import WelcomeScreen from "@/components/welcome-screen";
import ChatMessage from "@/components/chat-message";
import QuickActions from "@/components/quick-actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2 } from "lucide-react";
import WikipediaModal from "@/components/wikipedia-modal";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: loadingConversations } = useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();
  
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  
  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const { data: messages = [], isLoading: loadingMessages } = useListOpenaiMessages(activeConversationId || 0, {
    query: {
      enabled: !!activeConversationId,
      queryKey: getListOpenaiMessagesQueryKey(activeConversationId || 0)
    }
  });

  const [inputMessage, setInputMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [isWikiModalOpen, setIsWikiModalOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    setInputMessage("");
    setIsStreaming(true);
    setStreamingContent("");

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      const newConv = await createConversation.mutateAsync({ data: { title: "New Chat" } });
      currentConvId = newConv.id;
      setActiveConversationId(newConv.id);
      queryClient.invalidateQueries({ queryKey: getListOpenaiConversationsQueryKey() });
    }

    // Optimistic user message
    const userMessage: OpenaiMessage = {
      id: Date.now(),
      conversationId: currentConvId,
      role: "user",
      content: content,
      createdAt: new Date().toISOString()
    };
    
    queryClient.setQueryData(getListOpenaiMessagesQueryKey(currentConvId), (old: OpenaiMessage[] | undefined) => {
      return [...(old || []), userMessage];
    });

    try {
      const BASE = import.meta.env.BASE_URL;
      const response = await fetch(`${BASE}api/openai/conversations/${currentConvId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim().startsWith('data: '));
          
          for (const line of lines) {
            const dataStr = line.replace(/^data: /, '').trim();
            if (dataStr === '[DONE]') continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
              }
              if (data.done) {
                break;
              }
            } catch (e) {
              console.error("Error parsing SSE JSON", e);
            }
          }
        }
      }
      
      // Invalidate to get the final actual messages from the server
      queryClient.invalidateQueries({ queryKey: getListOpenaiMessagesQueryKey(currentConvId) });
      queryClient.invalidateQueries({ queryKey: getGetOpenaiConversationQueryKey(currentConvId) });
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputMessage);
    }
  };

  if (loadingConversations) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50/50">
      <header className="flex items-center px-6 py-4 bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-avi-gradient flex items-center justify-center text-white font-bold shadow-md">
            AVI
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900 leading-none">AVI</h1>
            <p className="text-sm text-gray-500">Your AI Best Friend</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto flex flex-col gap-6">
          {!activeConversationId || messages.length === 0 ? (
            <WelcomeScreen onSelectAction={handleSendMessage} />
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              {isStreaming && (
                <ChatMessage 
                  message={{
                    id: Date.now(),
                    conversationId: activeConversationId,
                    role: "assistant",
                    content: streamingContent,
                    createdAt: new Date().toISOString()
                  }} 
                  isStreaming={true} 
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      <footer className="p-4 md:p-6 bg-white border-t sticky bottom-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col gap-4">
          <QuickActions 
            onActionSelect={(action) => {
              if (action === "wikipedia") {
                setIsWikiModalOpen(true);
              } else if (action === "random_wikipedia" || action === "Tell me about a random Wikipedia article") {
                handleSendMessage("Tell me about a random Wikipedia article!");
              } else {
                handleSendMessage(action);
              }
            }} 
          />
          
          <div className="relative flex items-center">
            <Input
              data-testid="input-chat"
              placeholder="Ask AVI anything..."
              className="pr-14 py-6 text-base rounded-2xl shadow-sm border-gray-200 focus-visible:ring-primary/20"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            <Button
              data-testid="button-send"
              size="icon"
              className="absolute right-2 rounded-xl bg-avi-gradient hover:opacity-90 transition-opacity disabled:opacity-50"
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isStreaming}
            >
              <Send className="h-5 w-5 text-white" />
            </Button>
          </div>
        </div>
      </footer>

      <WikipediaModal 
        isOpen={isWikiModalOpen} 
        onClose={() => setIsWikiModalOpen(false)} 
        onInsert={(content) => handleSendMessage(`Tell me about: ${content}`)}
      />
    </div>
  );
}
