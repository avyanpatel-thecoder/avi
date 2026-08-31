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
import { Send, Loader2, Clock, LayoutGrid, Palette, HeadphonesIcon, MicOff, X } from "lucide-react";
import WikipediaModal from "@/components/wikipedia-modal";
import GoalGuessModal, { GoalGuessResult } from "@/components/goalguess-modal";
import { getSessionId } from "@/lib/session";
import { ThemeId, getTheme, saveConvTheme, loadConvTheme, saveCodingMode, loadCodingMode } from "@/lib/themes";
import CodingBackground from "@/components/coding-background";
import { useAchievements } from "@/hooks/use-achievements";
import { AchievementToastStack } from "@/components/achievement-toast";
import { Link } from "wouter";
import { Show, useAuth } from "@clerk/react";
import { useToast } from "@/hooks/use-toast";

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: {
    results: ArrayLike<ArrayLike<{ transcript: string }>>;
  }) => void) | null;
};

type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export default function ChatPage() {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const { toast } = useToast();
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
  const plusLaunchHandled = useRef(false);

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
  const [isListening, setIsListening] = useState(false);
  const [voiceSessionActive, setVoiceSessionActive] = useState(false);
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  const [isWikiModalOpen, setIsWikiModalOpen] = useState(false);
  const [isGoalGuessOpen, setIsGoalGuessOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const speakReplyRef = useRef(false);
  const voiceModeRef = useRef(false);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const lastShown = Number(localStorage.getItem("avi_signup_prompt_at") || 0);
    if (Date.now() - lastShown < 8 * 60 * 60 * 1000) return;
    const timer = window.setTimeout(() => {
      localStorage.setItem("avi_signup_prompt_at", String(Date.now()));
      setShowSignupPrompt(true);
    }, 30000);
    return () => window.clearTimeout(timer);
  }, []);

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
      const token = await getToken();
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await fetch(
        `${BASE}api/openai/conversations/${currentConvId}/messages`,
        { method: "POST", headers, body: JSON.stringify({ content }) }
      );
      if (!response.ok) {
        const errorBody = await response
          .json()
          .catch(() => ({ error: "AVI could not send your message." }));
        const message =
          typeof errorBody?.error === "string"
            ? errorBody.error
            : "AVI could not send your message.";
        throw new Error(message);
      }

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
      if (speakReplyRef.current && accumulatedContent) {
        const spokenText = accumulatedContent
          .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
          .replace(/[*_#`>]/g, "")
          .replace(/\s+/g, " ")
          .trim();
        try {
          const voiceHeaders: Record<string, string> = {
            "Content-Type": "application/json",
          };
          const voiceToken = await getToken();
          if (voiceToken) voiceHeaders.Authorization = `Bearer ${voiceToken}`;
          const voiceResponse = await fetch(`${BASE}api/openai/speech`, {
            method: "POST",
            headers: voiceHeaders,
            body: JSON.stringify({ text: spokenText }),
          });
          if (!voiceResponse.ok) throw new Error("Voice unavailable");
          const audioUrl = URL.createObjectURL(await voiceResponse.blob());
          const audio = new Audio(audioUrl);
          activeAudioRef.current = audio;
          audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            activeAudioRef.current = null;
            if (voiceModeRef.current) {
              window.setTimeout(startVoiceInput, 200);
            }
          };
          audio.onerror = () => {
            URL.revokeObjectURL(audioUrl);
            activeAudioRef.current = null;
          };
          await audio.play();
        } catch {
          toast({
            title: "AVI's natural voice is unavailable",
            description: "The typed reply is still shown above.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      speakReplyRef.current = false;
      queryClient.invalidateQueries({
        queryKey: getListOpenaiMessagesQueryKey(currentConvId),
      });
      toast({
        title: "Message not sent",
        description:
          error instanceof Error
            ? error.message
            : "Please try again in a moment.",
        variant: "destructive",
      });
    } finally {
      speakReplyRef.current = false;
      setIsStreaming(false);
      setStreamingContent("");
    }
  };

  const startVoiceInput = () => {
    const speechWindow = window as typeof window & {
      SpeechRecognition?: BrowserSpeechRecognitionConstructor;
      webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
    };
    const Recognition =
      speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;

    if (!Recognition) {
      toast({
        title: "Voice input is not supported here",
        description: "Try AVI Plus in Chrome or Edge.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      speechRecognitionRef.current?.stop();
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };
    recognition.onerror = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
      toast({
        title: "I couldn't hear that",
        description: "Please try the microphone again.",
        variant: "destructive",
      });
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        speakReplyRef.current = true;
        void handleSendMessage(transcript);
      }
    };
    speechRecognitionRef.current = recognition;
    recognition.start();
  };

  useEffect(() => {
    if (sessionStorage.getItem("avi_voice_mode") !== "true") return;
    sessionStorage.removeItem("avi_voice_mode");
    voiceModeRef.current = true;
    setVoiceSessionActive(true);
    const timer = window.setTimeout(startVoiceInput, 250);
    return () => {
      window.clearTimeout(timer);
      voiceModeRef.current = false;
      setVoiceSessionActive(false);
      speechRecognitionRef.current?.stop();
    };
  }, []);

  const stopVoiceChat = () => {
    voiceModeRef.current = false;
    setVoiceSessionActive(false);
    speechRecognitionRef.current?.stop();
    speechRecognitionRef.current = null;
    activeAudioRef.current?.pause();
    activeAudioRef.current = null;
  };

  useEffect(() => {
    if (plusLaunchHandled.current) return;
    const launchPrompt = sessionStorage.getItem("avi_plus_launch");
    if (!launchPrompt) return;
    plusLaunchHandled.current = true;
    sessionStorage.removeItem("avi_plus_launch");
    void handleSendMessage(launchPrompt);
  }, []);

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
          <Link href="/customersupport">
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:bg-white/25 rounded-xl h-9 w-9"
              title="Customer Support"
            >
              <HeadphonesIcon className="h-5 w-5" />
            </Button>
          </Link>
          <Show when="signed-in">
            <Link href="/plus">
              <Button
                variant="ghost"
                className="bg-white/20 hover:bg-white/30 text-white border border-white/40 rounded-xl h-9 px-3 text-xs font-bold shadow-sm transition-all"
                title="AVI Plus Account"
              >
                AVI Plus
              </Button>
            </Link>
          </Show>
          <Show when="signed-out">
            <Link href="/sign-up">
              <Button
                variant="ghost"
                className="bg-gradient-to-r from-purple-500 to-orange-400 hover:from-purple-400 hover:to-orange-300 text-white border-0 rounded-xl h-9 px-3 text-xs font-bold shadow-sm transition-all shadow-purple-900/20"
                title="Get AVI Plus (Free)"
              >
                Get Plus
              </Button>
            </Link>
          </Show>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-[1]">
        <div className="max-w-5xl mx-auto flex flex-col gap-5">
          <Show when="signed-out">
            {showSignupPrompt && (
              <div className="relative rounded-2xl border border-purple-200 bg-white p-4 pr-10 shadow-md">
                <button
                  type="button"
                  onClick={() => setShowSignupPrompt(false)}
                  className="absolute right-3 top-3 rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                  aria-label="Dismiss signup reminder"
                >
                  <X className="h-4 w-4" />
                </button>
                <p className="font-bold text-purple-900">Enjoying AVI?</p>
                <p className="mt-1 text-sm text-gray-600">
                  Sign up free to save your chats, earn badges, and unlock AVI Plus.
                </p>
                <Link href="/sign-up">
                  <Button size="sm" className="mt-3 bg-purple-600 hover:bg-purple-700">
                    Sign up free
                  </Button>
                </Link>
              </div>
            )}
          </Show>
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
            {voiceSessionActive && (
              <Button
                type="button"
                variant="outline"
                onClick={stopVoiceChat}
                className="flex-shrink-0 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                title="Stop voice chat"
              >
                <MicOff className="mr-1.5 h-4 w-4" />
                <span className="hidden sm:inline">Stop listening</span>
              </Button>
            )}
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
