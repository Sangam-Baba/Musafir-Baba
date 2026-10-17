import React from "react";
import Link from "next/link";
import { Bot, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const BotAvatar = ({ hidden = false }) => (
  <div
    aria-hidden="true"
    className={cn(
      "shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-[#FE5300] to-[#ff8a3d] text-white flex items-center justify-center shadow-[0_3px_8px_-2px_rgba(254,83,0,0.5)] ring-2 ring-white",
      hidden && "invisible"
    )}
  >
    <Bot size={14} />
  </div>
);

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

export const ChatMessage = ({
  sender,
  message,
  url,
  showAvatar = true,
}: {
  sender: string;
  message: string;
  url?: string;
  showAvatar?: boolean;
}) => {
  const isBot = sender === "bot";

  const renderTextWithLinks = (text: string) => {
    if (!text) return null;
    return text.split(URL_REGEX).map((part, i) => {
      if (/^https?:\/\//.test(part)) {
        // Bot replies list package URLs on their own line — show them as a
        // compact link instead of a long raw URL.
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold underline-offset-2 hover:underline",
              isBot ? "text-[#FE5300]" : "text-white"
            )}
          >
            View package
            <ArrowUpRight size={14} />
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Bot replies use blank lines between thoughts — show each paragraph as
  // its own bubble (single line breaks stay inside the bubble).
  const isDbResponse = isBot && message?.startsWith("Here is some information regarding");
  const messageBubbles =
    isBot && !isDbResponse && message && /\n\s*\n/.test(message)
      ? message.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
      : [message];

  return (
    <div className={cn("flex flex-col gap-1.5 mb-3", isBot ? "items-start" : "items-end")}>
      {messageBubbles.map((msgBubble, idx) => {
        const isLast = idx === messageBubbles.length - 1;
        return (
          <div
            key={idx}
            className={cn(
              "flex items-end gap-2 max-w-[88%] animate-in fade-in slide-in-from-bottom-1 duration-300",
              !isBot && "flex-row-reverse"
            )}
          >
            {isBot && <BotAvatar hidden={!(showAvatar && isLast)} />}
            <div
              className={cn(
                "px-3.5 py-2.5 text-[14px] leading-relaxed whitespace-pre-wrap break-words",
                isBot
                  ? "bg-white text-gray-800 rounded-[18px] shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-gray-200/70"
                  : "bg-gradient-to-br from-[#ff6b1f] to-[#FE5300] text-white rounded-[18px] shadow-[0_6px_16px_-6px_rgba(254,83,0,0.55)]",
                isBot && isLast && "rounded-bl-md",
                !isBot && "rounded-br-md"
              )}
            >
              {renderTextWithLinks(msgBubble)}
              {isLast && url && (
                <div className="mt-2.5">
                  <Link
                    href={url}
                    className="inline-flex items-center gap-1 bg-[#FE5300] text-white font-semibold text-[12.5px] px-3.5 py-1.5 rounded-full hover:bg-[#e04a00] active:scale-95 transition-all"
                  >
                    View Details
                    <ArrowUpRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
