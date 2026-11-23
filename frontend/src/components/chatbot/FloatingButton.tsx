"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Bot, Sparkles } from "lucide-react";

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

  // Package detail pages (/holidays/[categorySlug]/[destination]/[packageSlug])
  // render an extra sticky price/"Book Now" bar above the mobile bottom nav
  // (see SlugClients.tsx, fixed bottom-[65px] md:hidden) that this button's
  // default offset doesn't account for -- bump it up only on that exact
  // route shape so every other page's position is untouched.
  const pathname = usePathname();
  const segments = pathname?.split("/").filter(Boolean) ?? [];
  const hasStickyPriceBar = segments[0] === "holidays" && segments.length === 4;

  // Presentation only: while the visitor is scrolling, the teaser shrinks to a small "Ask Baba" pill; it grows back
  // shortly after scrolling stops, anywhere on the page. Opening, dismissing and the reappear timers below are unchanged.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    let idle: ReturnType<typeof setTimeout> | null = null;
    let lastY = window.scrollY;
    const onScroll = () => {
      // The browser nudges the page by a pixel or two while images load / the sticky header settles; those tiny
      // shifts are not the visitor scrolling, so they must not keep the pill small.
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 4) return;
      lastY = y;
      setCompact(true); // same value while scrolling — React skips the re-render
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => setCompact(false), 800);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (idle) clearTimeout(idle);
    };
  }, []);

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
      {/* Compact "Ask Baba" pill (after scrolling) — same open / dismiss actions as the card */}
      {!isOpen && showTeaser && compact && (
        <div
          className={`fixed ${hasStickyPriceBar ? "bottom-[153px]" : "bottom-[93px]"} right-[80px] md:bottom-[34px] md:right-[92px] z-50 flex items-center gap-1 pl-3 pr-1 py-1 rounded-full bg-gradient-to-r from-[#FE5300] to-amber-500 text-white shadow-[0_10px_25px_-6px_rgba(254,83,0,0.55)] ring-2 ring-white animate-in fade-in slide-in-from-right-2 duration-300`}
        >
          <button type="button" onClick={handleOpenChat} className="flex items-center gap-1.5 py-1 text-[13px] font-bold tracking-tight" aria-label="Ask Baba — open chat">
            <Sparkles size={14} className="motion-safe:animate-pulse" />
            <span>Ask Baba</span>
          </button>
          <button
            type="button"
            onClick={handleDismissTeaser}
            className="ml-0.5 p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-colors"
            title="Dismiss message"
            aria-label="Dismiss message"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Floating Teaser Message Card */}
      {!isOpen && showTeaser && !compact && (
        <div
          onClick={handleOpenChat}
          className={`fixed ${hasStickyPriceBar ? "bottom-[205px]" : "bottom-[145px]"} right-4 md:bottom-[72px] md:right-6 z-50 w-72 sm:w-80 rounded-2xl p-[1.5px] bg-gradient-to-br from-[#FE5300] via-amber-400 to-orange-300 shadow-[0_18px_45px_-10px_rgba(254,83,0,0.45)] cursor-pointer group hover:-translate-y-0.5 transition-[opacity,transform] duration-300 animate-in fade-in slide-in-from-bottom-3`}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleOpenChat();
            }
          }}
        >
          <div className="relative rounded-[15px] bg-white overflow-hidden">
            {/* Close button for teaser */}
            <button
              type="button"
              onClick={handleDismissTeaser}
              className="absolute top-1 right-1 text-white/90 hover:text-white hover:bg-white/20 p-2.5 rounded-full transition-colors z-10 min-w-[36px] min-h-[36px] flex items-center justify-center"
              title="Dismiss message"
              aria-label="Dismiss message"
            >
              <X size={14} />
            </button>

            {/* Header strip */}
            <div className="flex items-center gap-3 px-3.5 pt-3 pb-2.5 bg-gradient-to-r from-[#FE5300] to-amber-500 text-white">
              <div className="relative shrink-0 w-10 h-10 rounded-full bg-white/20 ring-2 ring-white/60 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
                <Bot size={20} />
                {/* Online green indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-white rounded-full"></span>
              </div>
              <div className="pr-6">
                <p className="text-[14px] font-extrabold leading-tight">Ask Baba 👋</p>
                <p className="flex items-center gap-1 text-[10.5px] font-semibold text-white/90 uppercase tracking-wider">
                  <Sparkles size={10} /> AI travel help · online now
                </p>
              </div>
            </div>

            {/* Message */}
            <div className="px-3.5 pt-2.5 pb-3">
              <p className="text-[13px] text-gray-700 leading-snug">
                Planning a trip or need visa help? <span className="font-semibold text-gray-900">Get answers in seconds.</span>
              </p>
              <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1.5 text-[12px] font-bold text-[#C2410C] ring-1 ring-orange-200 group-hover:bg-[#FE5300] group-hover:text-white group-hover:ring-[#FE5300] transition-colors">
                <span>Start chatting</span>
                <span className="group-hover:translate-x-0.5 transition-transform">→</span>
              </div>
            </div>
          </div>

          {/* Speech bubble downward pointer */}
          <div className="absolute -bottom-1.5 right-6 w-3.5 h-3.5 bg-amber-300 rotate-45 -z-10"></div>
        </div>
      )}

      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={handleOpenChat}
          className={`fixed ${hasStickyPriceBar ? "bottom-[145px]" : "bottom-[85px]"} right-4 md:bottom-6 md:right-6 z-50 p-3.5 md:p-4 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-full shadow-[0_10px_25px_-5px_rgba(249,115,22,0.5)] hover:shadow-[0_15px_30px_-5px_rgba(249,115,22,0.6)] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group`}
          aria-label="Open Chat Assistant"
        >
          {/* gentle attention ring (decorative) */}
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full bg-orange-400/60 motion-safe:animate-ping [animation-duration:2.4s]" />
          <MessageCircle size={26} className="relative group-hover:rotate-12 transition-transform duration-300" />
        </button>
      )}

      {/* Chat Widget Wrapper */}
      {isOpen && <LazyChatWidget onClose={handleCloseChat} />}
    </>
  );
}

