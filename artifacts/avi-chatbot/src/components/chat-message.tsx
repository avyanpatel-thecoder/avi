import { OpenaiMessage } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";

interface ChatMessageProps {
  message: OpenaiMessage;
  isStreaming?: boolean;
  onOptionClick?: (value: string) => void;
  index?: number;
}

interface ExtractedOption {
  label: string;
  value: string;
}

function extractOptions(content: string): { body: string; options: ExtractedOption[] } {
  const lines = content.split("\n");
  const optionIndices: number[] = [];
  const options: ExtractedOption[] = [];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Pattern 1: A) text, B) text, 1) text, 1. text
    const abcdMatch = trimmed.match(/^([A-D]|\d)[.)]\s+\*{0,2}(.+?)\*{0,2}\s*$/);
    if (abcdMatch && abcdMatch[2].trim().length > 0) {
      optionIndices.push(idx);
      options.push({
        label: trimmed.replace(/\*\*/g, ""),
        value: abcdMatch[2].replace(/\*\*/g, "").trim(),
      });
      return;
    }

    // Pattern 2: - text or * text (bullet-point options — short items only, max 60 chars)
    const bulletMatch = trimmed.match(/^[-*]\s+\*{0,2}(.+?)\*{0,2}\s*$/);
    if (bulletMatch && bulletMatch[1].trim().length > 0 && bulletMatch[1].trim().length <= 60) {
      optionIndices.push(idx);
      options.push({
        label: bulletMatch[1].replace(/\*\*/g, "").trim(),
        value: bulletMatch[1].replace(/\*\*/g, "").trim(),
      });
    }
  });

  if (options.length >= 2 && options.length <= 10) {
    const optionSet = new Set(optionIndices);
    const body = lines
      .filter((_, i) => !optionSet.has(i))
      .join("\n")
      .trim();
    return { body, options };
  }

  return { body: content, options: [] };
}

const optionColors = [
  "bg-purple-50 border-purple-300 text-purple-800 hover:bg-purple-100",
  "bg-pink-50 border-pink-300 text-pink-800 hover:bg-pink-100",
  "bg-orange-50 border-orange-300 text-orange-800 hover:bg-orange-100",
  "bg-amber-50 border-amber-300 text-amber-800 hover:bg-amber-100",
  "bg-green-50 border-green-300 text-green-800 hover:bg-green-100",
  "bg-sky-50 border-sky-300 text-sky-800 hover:bg-sky-100",
];

export default function ChatMessage({
  message,
  isStreaming = false,
  onOptionClick,
  index = 0,
}: ChatMessageProps) {
  const isUser = message.role === "user";
  const { body, options } = isUser || isStreaming
    ? { body: message.content, options: [] }
    : extractOptions(message.content);

  return (
    <motion.div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: isUser ? 280 : 200,
        damping: isUser ? 24 : 18,
        delay: isStreaming ? 0 : Math.min(index * 0.04, 0.3),
      }}
    >
      <div className={cn("flex max-w-[88%] md:max-w-[78%] gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>

        {!isUser && (
          <div className="flex-shrink-0 mt-1">
            <motion.div
              className="w-9 h-9 rounded-full bg-avi-gradient flex items-center justify-center text-white font-bold shadow-sm text-xs"
              animate={isStreaming ? { scale: [1, 1.12, 1] } : {}}
              transition={isStreaming ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" } : {}}
            >
              AVI
            </motion.div>
          </div>
        )}

        <div className="flex flex-col gap-2 min-w-0">
          <div
            className={cn(
              "rounded-2xl px-4 py-3 shadow-sm text-[14px] leading-relaxed",
              isUser
                ? "bg-gradient-to-br from-purple-100 to-pink-100 text-gray-900 rounded-tr-sm border border-purple-200"
                : "bg-white/90 border border-gray-100 text-gray-800 rounded-tl-sm avi-border-left backdrop-blur-sm"
            )}
          >
            {isStreaming && message.content === "" ? (
              <div className="flex items-center gap-2 text-gray-500 h-6">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-sm font-medium">AVI is thinking...</span>
              </div>
            ) : (
              <div className={cn(
                "prose prose-sm max-w-none break-words",
                !isUser && "avi-response"
              )}>
                <ReactMarkdown>{isUser ? message.content : body}</ReactMarkdown>
              </div>
            )}
          </div>

          {options.length > 0 && onOptionClick && (
            <motion.div
              className="flex flex-wrap gap-1.5 pl-1"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            >
              {options.map((opt, idx) => (
                <motion.button
                  key={idx}
                  onClick={() => onOptionClick(opt.value)}
                  className={cn(
                    "text-xs font-semibold px-3 py-1.5 rounded-full border-2 transition-colors duration-150 cursor-pointer",
                    optionColors[idx % optionColors.length]
                  )}
                  whileHover={{ scale: 1.08, y: -2 }}
                  whileTap={{ scale: 0.94 }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.18 + idx * 0.06, type: "spring", stiffness: 260 }}
                  data-testid={`option-btn-${idx}`}
                >
                  {opt.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
