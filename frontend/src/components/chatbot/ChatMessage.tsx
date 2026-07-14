import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const ChatMessage = ({ sender, message, url }) => {
  const isBot = sender === "bot";
  
  const renderTextWithLinks = (text) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer" 
            className={cn("underline font-medium hover:opacity-80 transition-opacity break-all", isBot ? "text-[#FE5300]" : "text-white font-bold")}
          >
            {part}
          </a>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={cn("flex w-full mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300", isBot ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed transition-all duration-300",
          isBot
            ? "bg-white text-gray-800 rounded-bl-none border border-gray-50 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)]"
            : "bg-gradient-to-tr from-[#FE5300] to-[#FF7A00] text-white rounded-br-none shadow-lg shadow-[#FE5300]/25" 
        )}
      >
        {renderTextWithLinks(message)}
        {url && (
          <div className="mt-3">
            <Link href={url} className="inline-block bg-[#FE5300] text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg shadow-[#FE5300]/20 hover:shadow-[#FE5300]/40 hover:scale-105 active:scale-95 transition-all duration-200">
              View Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
