"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { MessageCircle, X, Bot } from "lucide-react";

// Lazy load the ChatWidget so it doesn't block the main thread on page load.
// This is critical for Core Web Vitals (LCP, INP).
const LazyChatWidget = dynamic(() => import("./ChatWidget"), {
  ssr: false,
  loading: () => null,
});

export default function FloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const reappearTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Initial appearance after page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTeaser(true);
    }, 2000);

    return () => {
      clearTimeout(timer);
      if (reappearTimerRef.current) {
        clearTimeout(reappearTimerRef.current);
      }
    };
  }, []);

  const handleOpenChat = () => {
    if (reappearTimerRef.current) {
      clearTimeout(reappearTimerRef.current);
    }
    setIsOpen(true);
    setShowTeaser(false);
  };

  const handleCloseChat = () => {
    setIsOpen(false);
    // After closing the chat, re-show the teaser message after 25 seconds
    if (reappearTimerRef.current) {
      clearTimeout(reappearTimerRef.current);
    }
    reappearTimerRef.current = setTimeout(() => {
      setIsOpen((currentIsOpen) => {
        if (!currentIsOpen) {
          setShowTeaser(true);
        }
        return currentIsOpen;
      });
    }, 25000);
  };

  const handleDismissTeaser = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowTeaser(false);

    // Reappear after 20 seconds when closed by user
    if (reappearTimerRef.current) {
      clearTimeout(reappearTimerRef.current);
    }
    reappearTimerRef.current = setTimeout(() => {
      setIsOpen((currentIsOpen) => {
        if (!currentIsOpen) {
          setShowTeaser(true);
        }
        return currentIsOpen;
      });
    }, 20000);
  };

  return (
    <>
      {/* Floating Teaser Message Card */}
      {!isOpen && showTeaser && (
        <div
          onClick={handleOpenChat}
          className="fixed bottom-[145px] right-4 md:bottom-36 md:right-6 z-50 w-72 sm:w-80 bg-white/95 backdrop-blur-xl p-3.5 rounded-2xl shadow-[0_12px_35px_-8px_rgba(249,115,22,0.25)] border border-orange-100/80 cursor-pointer group hover:border-[#FE5300]/40 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleOpenChat();
            }
          }}
        >
          {/* Close button for teaser */}
          <button
            type="button"
            onClick={handleDismissTeaser}
            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full transition-colors z-10"
            title="Dismiss message"
            aria-label="Dismiss message"
          >
            <X size={14} />
          </button>

          <div className="flex items-start gap-3">
            <div className="relative shrink-0 w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform">
              <Bot size={20} />
              {/* Online green indicator */}
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
            </div>

            <div className="flex-1 pr-3">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-xs font-bold text-gray-900 tracking-tight">Musafir Baba</span>
                <span className="bg-orange-100 text-[#FE5300] text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider">AI Help</span>
              </div>
              <p className="text-[12.5px] text-gray-600 leading-snug">
                Planning a trip or need visa assistance? Chat with us!
              </p>
              <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-[#FE5300] group-hover:translate-x-0.5 transition-transform">
                <span>Start conversation</span>
                <span>→</span>
              </div>
            </div>
          </div>

          {/* Speech bubble downward pointer */}
          <div className="absolute -bottom-1.5 right-6 w-3.5 h-3.5 bg-white border-b border-r border-orange-100/80 rotate-45"></div>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className="fixed bottom-[85px] right-4 md:bottom-24 md:right-6 z-50 p-3.5 md:p-4 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(249,115,22,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(249,115,22,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
          aria-label="Open Chat Assistant"
        >
          <MessageCircle size={26} className="group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* Chat Widget Wrapper */}
      {isOpen && <LazyChatWidget onClose={handleCloseChat} />}
    </>
  );
}

