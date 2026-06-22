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
      className="flex items-center gap-2 p-3 border-t bg-white rounded-b-xl"
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Type a message..."
        className="flex-1 px-4 py-2 text-sm bg-gray-100 rounded-full focus:outline-none focus:ring-1 focus:ring-orange-500"
      />
      <button
        type="submit"
        disabled={!text.trim()}
        className="p-2 text-white bg-orange-500 rounded-full hover:bg-orange-600 disabled:opacity-50 transition-colors"
      >
        <SendHorizonal size={18} />
      </button>
    </form>
  );
};
