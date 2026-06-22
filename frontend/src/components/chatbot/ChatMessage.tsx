import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export const ChatMessage = ({ sender, message, url }) => {
  const isBot = sender === "bot";
  
  return (
    <div className={cn("flex w-full mb-4", isBot ? "justify-start" : "justify-end")}>
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed shadow-md transition-all duration-300",
          isBot
            ? "bg-white text-gray-800 rounded-bl-none border border-orange-50/50"
            : "bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-br-none shadow-orange-500/20" 
        )}
      >
        {message}
        {url && (
          <div className="mt-3">
            <Link href={url} className="inline-block bg-gradient-to-r from-orange-500 to-amber-500 text-white font-medium text-xs px-4 py-2 rounded-full shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-105 transition-all duration-200">
              View Details
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
