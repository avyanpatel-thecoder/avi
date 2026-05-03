import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MessageSquare, Plus, Clock } from "lucide-react";
import { OpenaiConversation } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: OpenaiConversation[];
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HistoryPanel({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
}: HistoryPanelProps) {
  const sorted = [...conversations].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="w-[300px] sm:w-[340px] p-0 flex flex-col">
        <div className="bg-avi-gradient-light px-5 py-4">
          <SheetHeader>
            <SheetTitle className="text-white font-bold text-lg flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Chat History
            </SheetTitle>
          </SheetHeader>
        </div>

        <div className="px-4 pt-4 pb-2">
          <Button
            className="w-full bg-avi-gradient hover:opacity-90 text-white rounded-xl font-semibold"
            onClick={() => { onNewChat(); onClose(); }}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-2 mt-1">
          {sorted.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No conversations yet
            </div>
          ) : (
            sorted.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { onSelectConversation(conv.id); onClose(); }}
                className={cn(
                  "w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-150 flex flex-col gap-0.5",
                  activeConversationId === conv.id
                    ? "border-purple-300 bg-purple-50 text-purple-900"
                    : "border-gray-100 bg-white hover:border-purple-200 hover:bg-purple-50/50 text-gray-800"
                )}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className={cn(
                    "w-3.5 h-3.5 flex-shrink-0",
                    activeConversationId === conv.id ? "text-purple-500" : "text-gray-400"
                  )} />
                  <span className="font-semibold text-sm truncate">{conv.title || "Chat"}</span>
                </div>
                <span className="text-xs text-gray-400 pl-5.5">{formatDate(conv.createdAt)}</span>
              </button>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
