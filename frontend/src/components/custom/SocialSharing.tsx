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
}

export default function SocialShare({ title, url }: SocialShareProps) {
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

  return (
    <div className="flex  gap-2 items-center ">
      <a
        href={shareLinks.twitter}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-blue-500 hover:bg-blue-600 text-white"
      >
        <Twitter size={18} />
      </a>
      <a
        href={shareLinks.facebook}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-blue-700 hover:bg-blue-800 text-white"
      >
        <Facebook size={18} />
      </a>
      <a
        href={shareLinks.linkedin}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Linkedin size={18} />
      </a>
      <a
        href={shareLinks.whatsapp}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-green-500 hover:bg-green-600 text-white"
      >
        <FaWhatsapp size={18} />
      </a>
      <button
        onClick={handleCopy}
        className="p-2 rounded-full bg-gray-500 hover:bg-gray-600 text-white"
      >
        {copied ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}
