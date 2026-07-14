import React, { useState } from "react";
import { SendHorizonal } from "lucide-react";

export const ChatInput = ({ onSendMessage }) => {
  const [text, setText] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (text.trim()) {
      onSendMessage(text);
      setText("");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 p-3 border-t border-gray-100/50 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.02)] bg-white/95 backdrop-blur-xl rounded-b-3xl"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2.5 text-sm bg-gray-50 border border-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-[#FE5300]/20 focus:border-[#FE5300] shadow-inner transition-all duration-200"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="p-2.5 text-white bg-[#FE5300] rounded-full hover:bg-[#E04800] disabled:opacity-50 transition-all duration-200 hover:scale-105 active:scale-95 shadow-md shadow-[#FE5300]/20"
      >
        <SendHorizonal size={18} className="ml-0.5" />
      </button>
    </form>
  );
};
