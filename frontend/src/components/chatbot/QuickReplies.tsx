import React from "react";

export const QuickReplies = ({
  replies,
  onSelect,
}: {
  replies: string[];
  onSelect: (reply: string) => void;
}) => {
  if (!replies || replies.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 pl-9 pb-2 animate-in fade-in slide-in-from-bottom-1 duration-300">
      {replies.map((reply, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(reply)}
          className="px-3.5 py-[7px] text-[13px] font-medium text-gray-800 bg-white rounded-full ring-1 ring-gray-200 shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:ring-[#FE5300] hover:text-[#FE5300] hover:bg-orange-50/60 hover:-translate-y-px hover:shadow-[0_4px_10px_-4px_rgba(254,83,0,0.35)] active:translate-y-0 active:scale-95 transition-all duration-150"
        >
          {reply}
        </button>
      ))}
    </div>
  );
};
