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
import ThemePicker from "@/components/theme-picker";
import ThemeBackground from "@/components/theme-background";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Clock, LayoutGrid, Palette, HeadphonesIcon } from "lucide-react";
import WikipediaModal from "@/components/wikipedia-modal";
import GoalGuessModal, { GoalGuessResult } from "@/components/goalguess-modal";
import { getSessionId } from "@/lib/session";
import { ThemeId, getTheme, saveConvTheme, loadConvTheme, saveCodingMode, loadCodingMode } from "@/lib/themes";
import CodingBackground from "@/components/coding-background";
import { useAchievements } from "@/hooks/use-achievements";
import { AchievementToastStack } from "@/components/achievement-toast";

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { data: conversations = [], isLoading: loadingConversations } =
    useListOpenaiConversations();
  const createConversation = useCreateOpenaiConversation();

  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeId | null>(null);
  const [isCodingMode, setIsCodingMode] = useState(false);

  const { state: achState, unlock, increment, toasts: achToasts, popToast } = useAchievements();

  // Ref to prevent auto-selection when user explicitly starts a new chat
  const newChatMode = useRef(false);

  // On first load: auto-select most recent conversation or show theme picker
  useEffect(() => {
    if (loadingConversations) return;
    if (newChatMode.current) return;
    if (activeConversationId) return;

    if (conversations.length > 0) {
      const first = conversations[0];
      setActiveConversationId(first.id);
      setSelectedTheme(loadConvTheme(first.id));
      setShowWelcome(false);
    } else {
      // No conversations yet — show theme picker
      setShowThemePicker(true);
    }
  }, [loadingConversations, conversations]); // eslint-disable-line

  // When active conversation changes from history selection, load its theme + coding mode
  useEffect(() => {
    if (activeConversationId) {
      setSelectedTheme(loadConvTheme(activeConversationId));
      setIsCodingMode(loadCodingMode(activeConversationId));
    }
  }, [activeConversationId]);

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
  const [isGoalGuessOpen, setIsGoalGuessOpen] = useState(false);
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
    setShowThemePicker(false);
    setInputMessage("");
    setIsStreaming(true);
    setStreamingContent("");

    // ── Achievement: message-content detection ─────────────────────────────
    const lc = content.toLowerCase();
    if (/trivia/i.test(lc)) unlock("trivia_star");
    if (/\bjoke\b/i.test(lc)) unlock("jokester");
    if (/\bbook\b/i.test(lc)) unlock("bookworm");
    if (/\bvacation\b/i.test(lc)) unlock("globetrotter");
    if (/wikipedia/i.test(lc)) unlock("wiki_explorer");

    let currentConvId = activeConversationId;

    if (!currentConvId) {
      const newConv = await createConversation.mutateAsync({
        data: { title: content.slice(0, 60) || "New Chat" },
      });
      currentConvId = newConv.id;
      newChatMode.current = false;
      setActiveConversationId(newConv.id);

      // Persist theme for this conversation
      if (selectedTheme) {
        saveConvTheme(newConv.id, selectedTheme);
      }

      // ── Achievement: first chat + conversation count ──────────────────────
      unlock("first_chat");
      increment("conversations", { unlockAt: 10, achievementId: "curious_mind" });

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
      // Detect coding mode toggle from the message text
      let activeCodingMode = isCodingMode;
      if (CODING_ACTIVATE.test(content) && !isCodingMode) {
        activeCodingMode = true;
        setIsCodingMode(true);
        if (currentConvId) saveCodingMode(currentConvId, true);
      } else if (CODING_DEACTIVATE.test(content) && isCodingMode) {
        activeCodingMode = false;
        setIsCodingMode(false);
        if (currentConvId) saveCodingMode(currentConvId, false);
      }

      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "X-Session-Id": getSessionId(),
      };
      if (selectedTheme) headers["X-Theme"] = selectedTheme;
      if (activeCodingMode) headers["X-Coding-Mode"] = "true";

      const response = await fetch(
        `${BASE}api/openai/conversations/${currentConvId}/messages`,
        { method: "POST", headers, body: JSON.stringify({ content }) }
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

  const CODING_ACTIVATE = /\b(coding mode|code mode|activate coding|start coding mode|enter coding)\b/i;
  const CODING_DEACTIVATE = /\b(exit coding|leave coding|deactivate coding|normal mode|exit coding mode)\b/i;

  const handleGoalGuessEnd = (result: GoalGuessResult) => {
    const toUnlock: string[] = ["goalguess_hero"];
    if (result.score >= 5) toUnlock.push("goalguess_champion");
    if (result.maxStreak >= 3) toUnlock.push("goalguess_streak");
    unlock(toUnlock);
  };

  const handleQuickAction = (action: string) => {
    if (action === "wikipedia") {
      unlock("wiki_explorer");
      setIsWikiModalOpen(true);
    } else if (action === "goalguess") {
      setIsGoalGuessOpen(true);
    } else if (action === "coding_mode") {
      unlock("code_apprentice");
      setIsCodingMode(true);
      if (activeConversationId) saveCodingMode(activeConversationId, true);
      handleSendMessage("Activate coding mode! Let's write some code!");
    } else if (
      action === "random_wikipedia" ||
      action === "Tell me about a random Wikipedia article"
    ) {
      unlock("random_ranger");
      handleSendMessage("Tell me about a random Wikipedia article!");
    } else {
      handleSendMessage(action);
    }
  };

  const handleNewChat = () => {
    newChatMode.current = true;
    setActiveConversationId(null);
    setSelectedTheme(null);
    setShowWelcome(false);
    setShowHistory(false);
    setShowThemePicker(true);
  };

  const handleSelectConversation = (id: number) => {
    newChatMode.current = false;
    setActiveConversationId(id);
    setShowWelcome(false);
    setShowThemePicker(false);
    setSelectedTheme(loadConvTheme(id));
  };

  const handleThemeSelected = (themeId: ThemeId) => {
    setSelectedTheme(themeId);
    setShowThemePicker(false);
    setShowWelcome(true);
  };

  const handleSkipTheme = () => {
    setSelectedTheme(null);
    setShowThemePicker(false);
    setShowWelcome(true);
  };

  const handleGoHome = () => {
    // If currently on the theme picker, treat home as "skip" → go to welcome
    if (showThemePicker) {
      setShowThemePicker(false);
      setShowWelcome(true);
      return;
    }
    // If in an active conversation, show the welcome/menu screen
    setShowWelcome(true);
    setShowThemePicker(false);
  };

  const activeTheme = getTheme(selectedTheme);

  const isInConversation =
    !showWelcome && !showThemePicker && !!activeConversationId && messages.length > 0;

  if (loadingConversations) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col h-screen relative"
      style={
        activeTheme
          ? { background: `linear-gradient(135deg, var(--theme-bg-start, #f9fafb), var(--theme-bg-end, #f3f4f6))` }
          : { background: "#f9fafb" }
      }
    >
      {/* Animated theme background */}
      {selectedTheme && !isCodingMode && <ThemeBackground themeId={selectedTheme} />}
      {isCodingMode && <CodingBackground />}

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between px-5 py-3 sticky top-0 z-10 shadow-sm"
        style={
          isCodingMode
            ? { background: "linear-gradient(135deg, #0a0f0a, #052e16, #064e3b)" }
            : activeTheme
            ? { background: activeTheme.headerGradient }
            : { background: "linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)" }
        }
      >
        <button
          onClick={handleGoHome}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer rounded-xl px-1 py-0.5"
          title="Home"
        >
          <div className="w-10 h-10 rounded-xl bg-white/25 border-2 border-white/60 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-black text-sm tracking-widest drop-shadow">
              {activeTheme ? activeTheme.emoji : "AVI"}
            </span>
          </div>
          <div className="text-left">
            <h1 className="text-white font-bold text-sm leading-tight tracking-wide">
              AVI - Artificial Virtual Intelligence
            </h1>
            {activeTheme && (
              <p className="text-white/70 text-[11px] leading-tight">{activeTheme.name} mode</p>
            )}
          </div>
        </button>

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
            onClick={handleNewChat}
            className="text-white hover:bg-white/25 rounded-xl h-9 w-9"
            title="Change Theme / New Chat"
          >
            <Palette className="h-5 w-5" />
          </Button>
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              const next = !isCodingMode;
              setIsCodingMode(next);
              if (activeConversationId) saveCodingMode(activeConversationId, next);
              if (next) unlock("code_apprentice");
            }}
            className={`rounded-xl h-9 w-9 font-mono text-xs transition-all ${
              isCodingMode
                ? "bg-green-500/20 text-green-300 hover:bg-green-500/30 border border-green-700/50"
                : "text-white hover:bg-white/25"
            }`}
            title={isCodingMode ? "Exit Coding Mode" : "Coding Mode"}
          >
            <HeadphonesIcon className="h-5 w-5 sr-only" />
            <span className="not-sr-only text-[11px] font-bold font-mono">{"</>"}</span>
          </Button>
          <a href={`${import.meta.env.BASE_URL}customersupport`}>
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/25 rounded-xl h-9 w-9"
              title="Customer Support"
            >
              <HeadphonesIcon className="h-5 w-5" />
            </Button>
          </a>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-[1]">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">
          {showThemePicker ? (
            <ThemePicker
              onSelect={handleThemeSelected}
              selectedTheme={selectedTheme}
            />
          ) : showWelcome || !activeConversationId || messages.length === 0 ? (
            <WelcomeScreen onSelectAction={handleQuickAction} themeId={selectedTheme} unlockedIds={achState.unlockedIds} />
          ) : (
            <div className="flex flex-col gap-5">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  message={msg}
                  onOptionClick={handleSendMessage}
                  index={idx}
                  themeId={selectedTheme}
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
                  index={messages.length}
                  themeId={selectedTheme}
                />
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="p-3 md:p-4 bg-white/90 backdrop-blur border-t sticky bottom-0 z-10">
        <div className="max-w-5xl mx-auto flex flex-col gap-2.5">
          {!showThemePicker && <QuickActions onActionSelect={handleQuickAction} />}

          <div className="flex items-center gap-2">
            <Input
              data-testid="input-chat"
              placeholder={
                showThemePicker
                  ? "Pick a theme above to start!"
                  : selectedTheme
                  ? `Ask AVI anything (${activeTheme?.name} mode)...`
                  : "Ask AVI anything..."
              }
              className="flex-1 py-5 text-sm rounded-2xl shadow-sm border-purple-200 focus-visible:ring-purple-300"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isStreaming || showThemePicker}
            />
            <Button
              data-testid="button-send"
              size="icon"
              className="flex-shrink-0 rounded-xl hover:opacity-90 transition-opacity disabled:opacity-40 h-10 w-10"
              style={
                activeTheme
                  ? { background: activeTheme.headerGradient }
                  : { background: "linear-gradient(135deg, #833AB4, #FD1D1D, #FCB045)" }
              }
              onClick={() => handleSendMessage(inputMessage)}
              disabled={!inputMessage.trim() || isStreaming || showThemePicker}
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

      <GoalGuessModal
        isOpen={isGoalGuessOpen}
        onClose={() => setIsGoalGuessOpen(false)}
        onGameEnd={handleGoalGuessEnd}
      />

      <HistoryPanel
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
      />

      {/* ── Achievement toast stack ── */}
      <AchievementToastStack toasts={achToasts} onDismiss={popToast} />
    </div>
  );
}
