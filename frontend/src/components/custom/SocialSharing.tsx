"use client";

import React, { useState } from "react";
import {
  Copy,
  Check,
  Facebook,
  Twitter,
  Linkedin,
  MessageSquare,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";

interface SocialShareProps {
  title: string;
  url: string;
  type?: "horizontal" | "vertical";
}

export default function SocialShare({ title, url, type = "horizontal" }: SocialShareProps) {
  const [copied, setCopied] = useState(false);

  const encodedTitle = encodeURIComponent(title);
  const encodedUrl = encodeURIComponent(url);

  const shareLinks = {
    twitter: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    whatsapp: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const btnClass = "p-2 rounded-xl transition-all duration-200 transform hover:scale-110 shadow-sm hover:shadow-md active:scale-95";

  return (
    <div className={`flex gap-2.5 items-center ${type === "vertical" ? "flex-col" : "flex-row"}`}>
      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnClass} bg-sky-500 hover:bg-sky-600 text-white`}
        title="Share on Twitter"
      >
        <Twitter size={18} />
      </a>
      <a
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnClass} bg-indigo-700 hover:bg-indigo-800 text-white`}
        title="Share on Facebook"
      >
        <Facebook size={18} />
      </a>
      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnClass} bg-blue-600 hover:bg-blue-700 text-white`}
        title="Share on LinkedIn"
      >
        <Linkedin size={18} />
      </a>
      <a
        href={shareLinks.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btnClass} bg-emerald-500 hover:bg-emerald-600 text-white`}
        title="Share on WhatsApp"
      >
        <FaWhatsapp size={18} />
      </a>
      <button
        onClick={handleCopy}
        className={`${btnClass} bg-gray-500 hover:bg-gray-600 text-white`}
        title="Copy Link"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}
