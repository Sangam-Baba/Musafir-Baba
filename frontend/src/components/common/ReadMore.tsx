"use client";
import { useState } from "react";
import { Button } from "../ui/button";
import { BlogContent } from "../custom/BlogContent";
function ReadMore({ content }: { content: string }) {
  const [showReadMore, setShowReadMore] = useState(false);
  return (
    <div className="flex justify-between">
      <BlogContent
        html={showReadMore ? content : `${content?.substring(0, 500)}`}
      />
      <p
        className="text-pretty font-semibold cursor-pointer whitespace-nowrap flex items-end hover:text-blue-600"
        onClick={() => setShowReadMore(!showReadMore)}
      >
        {showReadMore ? "Show Less" : "...Read More"}
      </p>
    </div>
  );
}

export default ReadMore;
