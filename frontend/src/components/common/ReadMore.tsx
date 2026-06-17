"use client";
import { useState, useRef, useEffect } from "react";
import { BlogContent } from "../custom/BlogContent";

function ReadMore({ content }: { content: string }) {
  const [showReadMore, setShowReadMore] = useState(false);
  const [isTruncated, setIsTruncated] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      // Check if content exceeds our max-height (e.g., ~150px or roughly 4-5 lines)
      setIsTruncated(contentRef.current.scrollHeight > 160);
    }
  }, [content]);

  return (
    <div className="flex flex-col">
      <div 
        ref={contentRef}
        className={`relative overflow-hidden transition-all duration-300 ${showReadMore ? "max-h-[5000px]" : "max-h-[160px]"}`}
      >
        <BlogContent html={content} />
        
        {/* Fade out effect at the bottom when collapsed */}
        {!showReadMore && isTruncated && (
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-gray-50 to-transparent pointer-events-none" />
        )}
      </div>
      
      {isTruncated && (
        <div className="mt-2 flex justify-end">
          <p
            className="font-semibold cursor-pointer text-[#FE5300] hover:text-[#e14a00] transition-colors"
            onClick={() => setShowReadMore(!showReadMore)}
          >
            {showReadMore ? "Show Less" : "Read More"}
          </p>
        </div>
      )}
    </div>
  );
}

export default ReadMore;
