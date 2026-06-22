import React from "react";

export const QuickReplies = ({ replies, onSelect }) => {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-4 px-2">
      {replies.map((reply, idx) => (
        <button
          key={idx}
          onClick={() => onSelect(reply)}
          className="px-4 py-2 text-xs font-semibold text-orange-700 bg-orange-50/80 border border-orange-200/50 rounded-full shadow-sm hover:bg-orange-100 hover:shadow-md transition-all duration-200 backdrop-blur-sm"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
