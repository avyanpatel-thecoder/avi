import { OpenaiMessage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface ChatMessageProps {
  message: OpenaiMessage;
  isStreaming?: boolean;
}

export default function ChatMessage({ message, isStreaming = false }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div className={cn("flex max-w-[85%] md:max-w-[75%] gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
        
        {!isUser && (
          <div className="flex-shrink-0 mt-1">
            <div className="w-10 h-10 rounded-full bg-avi-gradient flex items-center justify-center text-white font-bold shadow-sm text-sm">
              AVI
            </div>
          </div>
        )}
        
        <div
          className={cn(
            "rounded-2xl px-5 py-3.5 shadow-sm text-[15px] leading-relaxed",
            isUser
              ? "bg-gray-100 text-gray-900 rounded-tr-sm"
              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
          )}
        >
          {isStreaming && message.content === "" ? (
            <div className="flex items-center gap-2 text-gray-500 h-6">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">AVI is thinking...</span>
            </div>
          ) : (
            <div className="prose prose-sm md:prose-base prose-p:leading-relaxed prose-pre:bg-gray-800 prose-pre:text-gray-100 max-w-none break-words">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
