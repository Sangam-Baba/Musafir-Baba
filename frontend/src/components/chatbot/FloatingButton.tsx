"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { MessageCircle } from "lucide-react";

// Lazy load the ChatWidget so it doesn't block the main thread on page load.
// This is critical for Core Web Vitals (LCP, INP).
const LazyChatWidget = dynamic(() => import("./ChatWidget"), {
  ssr: false,
  loading: () => null,
});

export default function FloatingButton() {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-[85px] right-4 md:bottom-24 md:right-6 z-50 p-4 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(249,115,22,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(249,115,22,0.6)] hover:scale-110 transition-all duration-300"
          aria-label="Open Chat Assistant"
        >
          <MessageCircle size={28} />
        </button>
      )}

      {/* Chat Widget Wrapper */}
      {isOpen && <LazyChatWidget onClose={() => setIsOpen(false)} />}
    </>
  );
}
