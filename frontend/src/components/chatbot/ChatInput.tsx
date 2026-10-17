import React, { useState } from "react";
import { SendHorizonal, Lock } from "lucide-react";

export const ChatInput = ({
  onSendMessage,
  disabled = false,
}: {
  onSendMessage: (text: string) => void;
  disabled?: boolean;
}) => {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (text.trim() && !disabled) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="shrink-0 border-t border-gray-100 bg-white px-3 pt-3 pb-2.5">
      <div className="flex items-center gap-2 bg-white rounded-2xl pl-4 pr-1.5 py-1.5 ring-1 ring-gray-200 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] focus-within:ring-2 focus-within:ring-[#FE5300]/45 transition-all">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type your message…"
          aria-label="Type your message"
          className="flex-1 min-w-0 bg-transparent text-[14px] text-gray-800 placeholder:text-gray-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim() || disabled}
          aria-label="Send message"
          className="w-9 h-9 shrink-0 flex items-center justify-center text-white bg-gradient-to-br from-[#ff6b1f] to-[#FE5300] rounded-xl shadow-[0_4px_12px_-4px_rgba(254,83,0,0.6)] hover:brightness-105 disabled:from-gray-200 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed active:scale-95 transition-all"
        >
          <SendHorizonal size={17} />
        </button>
      </div>
      <p className="flex items-center justify-center gap-1 text-[10.5px] text-gray-400 mt-2">
        <Lock size={10} aria-hidden="true" />
        Your details are shared only with our travel experts
      </p>
    </form>
  );
};
