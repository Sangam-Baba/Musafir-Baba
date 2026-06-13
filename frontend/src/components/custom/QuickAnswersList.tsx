import React from "react";
import { BlogContent } from "./BlogContent";
import { CheckCircle2 } from "lucide-react";

export default function QuickAnswersList({ html }: { html: string }) {
  // Extract list items using regex
  const liRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const matches = [...html.matchAll(liRegex)];
  
  const data: { label: string; text: string }[] = [];
  
  for (const match of matches) {
    const rawContent = match[1];
    const cleanContent = rawContent.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    
    if (cleanContent) {
      // Check if there is a colon to split into bold label and normal text
      const splitIndex = cleanContent.indexOf(':');
      if (splitIndex !== -1 && splitIndex < 50) { // arbitrary limit to ensure it's actually a label
        data.push({
          label: cleanContent.substring(0, splitIndex).trim(),
          text: cleanContent.substring(splitIndex + 1).trim()
        });
      } else {
        data.push({
          label: '',
          text: cleanContent
        });
      }
    }
  }

  // If no list items found, fallback to standard rendering
  if (data.length === 0) {
    return (
      <div className="prose prose-base max-w-none text-gray-600 leading-relaxed">
        <BlogContent html={html} />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {data.map((item, index) => (
        <div 
          key={index} 
          className="flex items-start gap-3 p-4 rounded-xl border border-gray-100 bg-white shadow-sm hover:shadow-md hover:border-[#FE5300]/30 transition-all duration-300"
        >
          <div className="flex-shrink-0 mt-0.5 text-green-500">
            <CheckCircle2 size={18} />
          </div>
          <div className="flex flex-col">
            {item.label && (
              <span className="text-sm font-bold text-gray-900 mb-0.5">
                {item.label}
              </span>
            )}
            <span className="text-sm text-gray-600 leading-relaxed">
              {item.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
