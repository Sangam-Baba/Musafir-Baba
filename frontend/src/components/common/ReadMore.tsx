"use client";
import { useState } from "react";
import { BlogContent } from "../custom/BlogContent";
function ReadMore({ content }: { content: string }) {
  const [showReadMore, setShowReadMore] = useState(false);

  const paragraphs = content
    ?.split("</p>")
    .filter((p) => p.trim() !== "")
    .map((p) => p + "</p>");

  const previewHtml = paragraphs.slice(0, 1).join("");
  const fullHtml = paragraphs.join("");
  return (
    <div className="flex flex-col">
      <BlogContent html={showReadMore ? fullHtml : previewHtml} />
      {paragraphs.length > 2 && (
        <p
          className="justify-end text-pretty font-semibold cursor-pointer whitespace-nowrap flex items-end text-[#FE5300] hover:text-blue-600 mb-0.5"
          onClick={() => setShowReadMore(!showReadMore)}
        >
          {showReadMore ? "Show Less" : "Read More"}
        </p>
      )}
    </div>
  );
}

export default ReadMore;
