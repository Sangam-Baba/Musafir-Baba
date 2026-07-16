import React from "react";

export const QuickReplies = ({ replies, onSelect }) => {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3 px-4 pb-2">
      {replies.map((reply, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(reply)}
          className="shrink-0 px-4 py-2 text-xs font-bold text-[#FE5300] bg-white border border-[#FE5300]/30 rounded-full shadow-sm hover:bg-[#FE5300] hover:text-white hover:shadow-md transition-all duration-200 backdrop-blur-sm"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
