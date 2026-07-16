"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bot, X, RefreshCcw } from "lucide-react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { QuickReplies } from "./QuickReplies";
import { getWhatsAppLink } from "@/config/contact";

const WhatsappIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width={size} height={size} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.052 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function ChatWidget({ onClose }) {
  const [messages, setMessages] = useState([]);
  const [quickReplies, setQuickReplies] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages, quickReplies]);

  // Initial load
  useEffect(() => {
    const sid = localStorage.getItem("chat_session_id");
    if (sid) {
      setSessionId(sid);
      fetchHistory(sid);
    } else {
      // Send greeting to get session
      sendMessage("Hello");
    }
  }, []);

  const fetchHistory = async (sid) => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api";
      const res = await fetch(`${baseUrl}/chatbot/history/${sid}`);
      const data = await res.json();
      setMessages(data);
      if (data.length > 0) {
        const lastMsg = data[data.length - 1];
        if (lastMsg.quickReplies && lastMsg.quickReplies.length > 0) {
          setQuickReplies(lastMsg.quickReplies);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetChat = () => {
    localStorage.removeItem("chat_session_id");
    setSessionId(null);
    setMessages([]);
    setQuickReplies([]);
    // The useEffect will not re-trigger automatically, so we send the greeting manually
    setTimeout(() => {
      // Create a fresh flow
      const text = "Hello";
      const userMsg = { sender: "user", message: text };
      setMessages([userMsg]);
      setIsLoading(true);
      
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api";
      fetch(`${baseUrl}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }), // no session ID -> creates new
      }).then(res => res.json()).then(data => {
        setSessionId(data.sessionId);
        localStorage.setItem("chat_session_id", data.sessionId);
        setMessages((prev) => [...prev, { sender: "bot", message: data.response }]);
        setQuickReplies(data.quickReplies || []);
      }).finally(() => setIsLoading(false));
    }, 100);
  };

  const openWhatsApp = () => {
    const text = "Hi Musafir Baba, I need help with my travel plans!";
    window.open(getWhatsAppLink(text), "_blank");
  };

  const sendMessage = async (text) => {
    const userMsg = { sender: "user", message: text };
    setMessages((prev) => [...prev, userMsg]);
    setQuickReplies([]);
    setIsLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000/api";
      const res = await fetch(`${baseUrl}/chatbot/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json();
      
      if (!sessionId) {
        setSessionId(data.sessionId);
        localStorage.setItem("chat_session_id", data.sessionId);
      }

      setMessages((prev) => [...prev, { sender: "bot", message: data.response, url: data.url }]);
      setQuickReplies(data.quickReplies || []);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { sender: "bot", message: "Sorry, I am having trouble connecting right now." },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 w-80 sm:w-96 h-[500px] max-h-[80vh] bg-white/80 backdrop-blur-3xl rounded-3xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.15)] flex flex-col z-50 border border-white overflow-hidden animate-in zoom-in-95 duration-300 slide-in-from-bottom-5">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-xl border-b border-gray-100 p-4 text-gray-800 flex justify-between items-center shrink-0 shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] z-10">
        <div className="flex items-center gap-2">
          <Bot size={20} className="text-[#FE5300]" />
          <span className="font-bold tracking-wide text-gray-900">Musafir Baba</span>
        </div>
        <div className="flex items-center gap-1 text-gray-500">
          <button onClick={openWhatsApp} title="Chat on WhatsApp" className="hover:bg-gray-100 hover:text-[#FE5300] p-1.5 rounded-xl transition-all duration-200">
            <WhatsappIcon size={18} />
          </button>
          <button onClick={resetChat} title="New Chat" className="hover:bg-gray-100 hover:text-[#FE5300] p-1.5 rounded-xl transition-all duration-200">
            <RefreshCcw size={18} />
          </button>
          <button onClick={onClose} title="Close" className="hover:bg-gray-100 hover:text-[#FE5300] p-1.5 rounded-xl transition-all duration-200 ml-1">
            <X size={20} />
          </button>
        </div>
      </div>

      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
        {messages.map((m, idx) => (
          <ChatMessage key={idx} sender={m.sender} message={m.message} url={m.url} />
        ))}
        {isLoading && (
          <div className="flex justify-start mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="bg-white text-gray-500 rounded-2xl px-4 py-2.5 text-sm rounded-bl-none shadow-sm border border-gray-100 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="shrink-0 pt-2 bg-gradient-to-t from-white via-white to-transparent rounded-b-3xl">
        <QuickReplies replies={quickReplies} onSelect={sendMessage} />
        <ChatInput onSendMessage={sendMessage} />
      </div>
    </div>
  );
}
