"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bot, X, RotateCcw, BadgeCheck, Sparkles, Star } from "lucide-react";
import { ChatMessage, BotAvatar } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { getWhatsAppLink } from "@/config/contact";

const WhatsappIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

// Old builds kept the session in localStorage, so every visit reopened the
// previous conversation. It now lives in memory only: closing and reopening
// the chat during a visit keeps it, a fresh visit / reload starts clean.
const LEGACY_SESSION_KEY = "chat_session_id";
let memorySessionId: string | null = null;
// Sent automatically to start a conversation; not something the visitor typed,
// so it's never shown as their message.
const GREETING = "Hello";
const WHATSAPP_REPLY = "Open WhatsApp directly";
export interface ChatMsg {
  sender: string;
  message: string;
  url?: string;
  quickReplies?: string[];
}

const getBaseUrl = () => process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api";

export default function ChatWidget({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Mirrors sessionId/isLoading synchronously, so a fast double click or a
  // reset mid-request can't send twice or pick up a stale session.
  const sessionRef = useRef<string | null>(null);
  const busyRef = useRef(false);

  // Auto-scroll the message list only (scrollIntoView could also scroll the page)
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, quickReplies, isLoading]);

  const saveSession = (sid: string | null) => {
    sessionRef.current = sid;
    memorySessionId = sid;
    setSessionId(sid);
  };

  const sendMessage = async (text: string, { silent = false }: { silent?: boolean } = {}) => {
    const trimmed = (text || "").trim();
    if (!trimmed || busyRef.current) return;

    if (trimmed === WHATSAPP_REPLY) {
      openWhatsApp();
      return;
    }

    busyRef.current = true;
    if (!silent) setMessages((prev) => [...prev, { sender: "user", message: trimmed }]);
    setQuickReplies([]);
    setIsLoading(true);

    try {
      const res = await fetch(`${getBaseUrl()}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionRef.current || undefined,
          // Recorded as the lead's source page
          pageUrl: typeof window !== "undefined" ? window.location.href : undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.response) throw new Error(data?.error || `HTTP ${res.status}`);

      if (data.sessionId && data.sessionId !== sessionRef.current) saveSession(data.sessionId);

      setMessages((prev) => [...prev, { sender: "bot", message: data.response, url: data.url }]);
      setQuickReplies(Array.isArray(data.quickReplies) ? data.quickReplies : []);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", message: "Sorry, I am having trouble connecting right now. Please try again, or reach us on WhatsApp." },
      ]);
    } finally {
      busyRef.current = false;
      setIsLoading(false);
    }
  };

  const startNewChat = () => {
    saveSession(null);
    setMessages([]);
    setQuickReplies([]);
    sendMessage(GREETING, { silent: true });
  };

  const fetchHistory = async (sid: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${getBaseUrl()}/chatbot/history/${encodeURIComponent(sid)}`);
      const data = await res.json().catch(() => null);
      if (!res.ok || !Array.isArray(data) || data.length === 0) {
        // Expired/unknown session or server error: start fresh instead of
        // showing an empty (or crashed) window.
        setIsLoading(false);
        startNewChat();
        return;
      }
      // Hide the automatic opening "Hello" that started the session
      const visible = data[0]?.sender === "user" && data[0]?.message === GREETING ? data.slice(1) : data;
      setMessages(visible);
      const lastMsg = data[data.length - 1];
      if (lastMsg?.sender === "bot" && Array.isArray(lastMsg.quickReplies)) {
        setQuickReplies(lastMsg.quickReplies);
      }
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
      startNewChat();
    }
  };

  // Initial load
  useEffect(() => {
    try {
      localStorage.removeItem(LEGACY_SESSION_KEY);
    } catch {}
    const sid = memorySessionId;
    if (sid) {
      sessionRef.current = sid;
      setSessionId(sid);
      fetchHistory(sid);
    } else {
      startNewChat();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openWhatsApp = () => {
    const text = "Hi Musafir Baba, I need help with my travel plans!";
    window.open(getWhatsAppLink(text), "_blank");
  };

  const headerBtn =
    "w-9 h-9 flex items-center justify-center rounded-full text-white/85 hover:text-white hover:bg-white/15 active:bg-white/25 transition-colors";

  return (
    <div
      role="dialog"
      aria-label="Musafir Baba chat assistant"
      className="fixed z-[60] bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:w-[390px] h-[620px] max-h-[calc(100dvh-7rem)] bg-white rounded-[22px] shadow-[0_32px_80px_-16px_rgba(15,23,42,0.35),0_8px_24px_-8px_rgba(254,83,0,0.18)] ring-1 ring-black/[0.06] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 origin-bottom-right"
    >
      {/* Header */}
      <div className="relative shrink-0 overflow-hidden bg-gradient-to-br from-[#ff6b1f] via-[#FE5300] to-[#e2430a] text-white px-4 pt-4 pb-3.5">
        {/* soft decorative glows */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-14 -right-10 w-40 h-40 rounded-full bg-white/15 blur-2xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-10 w-36 h-36 rounded-full bg-amber-300/25 blur-2xl" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-full bg-white text-[#FE5300] flex items-center justify-center shadow-[0_4px_14px_rgba(0,0,0,0.18)]">
                <Bot size={22} strokeWidth={2.2} />
              </div>
              <span className="absolute bottom-0 right-0 flex w-3 h-3">
                <span className="absolute inline-flex w-full h-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-[#FE5300]" />
              </span>
            </div>
            <div className="min-w-0 leading-tight">
              <p className="flex items-center gap-1 font-semibold text-[15.5px] tracking-tight truncate">
                Musafir Baba
                <BadgeCheck size={15} className="shrink-0 text-white/95" aria-label="Verified" />
              </p>
              <p className="text-[12px] text-white/85 truncate mt-0.5">Online · Replies in seconds</p>
            </div>
          </div>
          <div className="flex items-center shrink-0 -mr-1.5">
            <button type="button" onClick={openWhatsApp} title="Chat on WhatsApp" aria-label="Chat on WhatsApp" className={headerBtn}>
              <WhatsappIcon size={17} />
            </button>
            <button type="button" onClick={startNewChat} disabled={isLoading} title="Start a new chat" aria-label="Start a new chat" className={`${headerBtn} disabled:opacity-50`}>
              <RotateCcw size={17} />
            </button>
            <button type="button" onClick={onClose} title="Close" aria-label="Close chat" className={headerBtn}>
              <X size={19} />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain bg-gradient-to-b from-[#fbf8f6] to-[#f4f4f7] px-4 pt-4 pb-2">
        {/* Welcome card */}
        <div className="mb-5 rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,0.05)] ring-1 ring-gray-200/70">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-[#FE5300] to-[#ff8a3d] text-white flex items-center justify-center shadow-[0_6px_16px_-6px_rgba(254,83,0,0.6)]">
              <Sparkles size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold text-gray-900">Your personal travel assistant</p>
              <p className="text-[12.5px] leading-snug text-gray-500 mt-0.5">
                Holidays, visas &amp; car rentals — our experts follow up on WhatsApp.
              </p>
            </div>
          </div>
          <div className="mt-3.5 grid grid-cols-3 divide-x divide-gray-100 rounded-xl bg-gray-50/80 py-2 text-center">
            <div>
              <p className="flex items-center justify-center gap-0.5 text-[13px] font-bold text-gray-900">
                4.8 <Star size={11} className="fill-amber-400 text-amber-400" />
              </p>
              <p className="text-[10.5px] text-gray-500">Google rating</p>
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">24,000+</p>
              <p className="text-[10.5px] text-gray-500">Travellers</p>
            </div>
            <div>
              <p className="text-[13px] font-bold text-gray-900">2016</p>
              <p className="text-[10.5px] text-gray-500">Trusted since</p>
            </div>
          </div>
        </div>

        {messages.map((m, idx) => (
          <ChatMessage
            key={idx}
            sender={m.sender}
            message={m.message}
            url={m.url}
            showAvatar={m.sender === "bot" && messages[idx - 1]?.sender !== "bot"}
          />
        ))}
        {isLoading && (
          <div className="flex items-end gap-2 mb-3 animate-in fade-in duration-300">
            <BotAvatar />
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.06)] ring-1 ring-gray-200/70 flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-[#FE5300]/70 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-[#FE5300]/70 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-[#FE5300]/70 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        {!isLoading && (
          <QuickReplies replies={quickReplies} onSelect={(reply) => sendMessage(reply)} />
        )}
      </div>

      {/* Input */}
      <ChatInput onSendMessage={(text) => sendMessage(text)} disabled={isLoading} />
    </div>
  );
}
