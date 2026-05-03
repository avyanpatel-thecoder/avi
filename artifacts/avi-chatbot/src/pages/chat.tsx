import { useQueryClient } from "@tanstack/react-query";
import {
  useListOpenaiConversations,
  useCreateOpenaiConversation,
  useListOpenaiMessages,
  getListOpenaiConversationsQueryKey,
  getListOpenaiMessagesQueryKey,
  getGetOpenaiConversationQueryKey,
  OpenaiMessage,
} from "@workspace/api-client-react";
import { useState, useRef, useEffect } from "react";
import WelcomeScreen from "@/components/welcome-screen";
import ChatMessage from "@/components/chat-message";
import QuickActions from "@/components/quick-actions";
import HistoryPanel from "@/components/history-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Clock, LayoutGrid } from "lucide-react";
import WikipediaModal from "@/components/wikipedia-modal";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: loadingConversations } =
    useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (conversations.length > 0 && !activeConversationId) {
      setActiveConversationId(conversations[0].id);
    }
  }, [conversations, activeConversationId]);

  const { data: messages = [] } = useListOpenaiMessages(
    activeConversationId || 0,
    {
      query: {
        enabled: !!activeConversationId,
        queryKey: getListOpenaiMessagesQueryKey(activeConversationId || 0),
      },
    }
  );

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

    setShowWelcome(false);
    setInputMessage("");
    setIsStreaming(true);
    setStreamingContent("");

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      const newConv = await createConversation.mutateAsync({
        data: { title: "New Chat" },
      });
      currentConvId = newConv.id;
      setActiveConversationId(newConv.id);
      queryClient.invalidateQueries({
        queryKey: getListOpenaiConversationsQueryKey(),
      });
    }

    const userMessage: OpenaiMessage = {
      id: Date.now(),
      conversationId: currentConvId,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    queryClient.setQueryData(
      getListOpenaiMessagesQueryKey(currentConvId),
      (old: OpenaiMessage[] | undefined) => [...(old || []), userMessage]
    );

    try {
      const BASE = import.meta.env.BASE_URL;
      const response = await fetch(
        `${BASE}api/openai/conversations/${currentConvId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        }
      );

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk
            .split("\n")
            .filter((line) => line.trim().startsWith("data: "));

          for (const line of lines) {
            const dataStr = line.replace(/^data: /, "").trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.content) {
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
              }
              if (data.done) break;
            } catch {
              // ignore parse errors
            }
          }
        }
      }

      queryClient.invalidateQueries({
        queryKey: getListOpenaiMessagesQueryKey(currentConvId),
      });
      queryClient.invalidateQueries({
        queryKey: getGetOpenaiConversationQueryKey(currentConvId),
      });
    } catch {
      // ignore network errors
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

  const handleQuickAction = (action: string) => {
    if (action === "wikipedia") {
      setIsWikiModalOpen(true);
    } else if (
      action === "random_wikipedia" ||
      action === "Tell me about a random Wikipedia article"
    ) {
      handleSendMessage("Tell me about a random Wikipedia article!");
    } else {
      handleSendMessage(action);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setShowWelcome(true);
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    setShowWelcome(false);
  };

  const isInConversation =
    !showWelcome && !!activeConversationId && messages.length > 0;

  if (loadingConversations) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50/60">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-5 py-3 bg-avi-gradient-light sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/25 border-2 border-white/60 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm tracking-widest drop-shadow">AVI</span>
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight tracking-wide">
              AVI - Artificial Virtual Intelligence
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isInConversation && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowWelcome(true)}
              className="text-white hover:bg-white/25 rounded-xl h-9 w-9"
              title="Main Menu"
              data-testid="button-main-menu"
            >
              <LayoutGrid className="h-5 w-5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowHistory(true)}
            className="text-white hover:bg-white/25 rounded-xl h-9 w-9"
            title="Chat History"
            data-testid="button-history"
          >
            <Clock className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          {showWelcome || !activeConversationId || messages.length === 0 ? (
            <WelcomeScreen onSelectAction={handleQuickAction} />
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((msg) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOptionClick={handleSendMessage}
                />
              ))}
              {isStreaming && (
                <ChatMessage
                  message={{
                    id: Date.now(),
                    conversationId: activeConversationId,
                    role: "assistant",
                    content: streamingContent,
                    createdAt: new Date().toISOString(),
                  }}
                  isStreaming={true}
                  onOptionClick={handleSendMessage}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="p-3 md:p-4 bg-white border-t sticky bottom-0 z-10">
        <div className="max-w-3xl mx-auto flex flex-col gap-2.5">
          <QuickActions onActionSelect={handleQuickAction} />

          <div className="relative flex items-center">
            <Input
              data-testid="input-chat"
              placeholder="Ask AVI anything..."
              className="pr-12 py-5 text-sm rounded-2xl shadow-sm border-purple-200 focus-visible:ring-purple-300"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming}
            />
            <Button
              data-testid="button-send"
              size="icon"
              className="absolute right-2 rounded-xl bg-avi-gradient hover:opacity-90 transition-opacity disabled:opacity-40 h-9 w-9"
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isStreaming}
            >
              <Send className="h-4 w-4 text-white" />
            </Button>
          </div>

          <p className="text-center text-[10px] text-gray-400 leading-tight">
            Powered by Artificial Virtual Intelligence. All rights reserved 2026
          </p>
        </div>
      </footer>

      {/* ── Modals ── */}
      <WikipediaModal
        isOpen={isWikiModalOpen}
        onClose={() => setIsWikiModalOpen(false)}
        onInsert={(content) => handleSendMessage(`Tell me about: ${content}`)}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />
    </div>
  );
}
