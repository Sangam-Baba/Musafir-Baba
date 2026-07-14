"use client";
import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { getWhatsAppLink } from "@/config/contact";

export default function WhatsAppButton() {
  const whatsappLink = getWhatsAppLink();

  return (
    <div className="hidden md:flex fixed bottom-6 right-6 z-50 items-center gap-2">
      <div className="relative bg-green-100 text-green-800 text-sm font-medium px-3 py-2 rounded-xl shadow-md">
        Ask Baba
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-6 border-l-green-100"></div>
      </div>
      <a
        href={whatsappLink}
        target="_blank"
        rel="nofollow noopener noreferrer"
        className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition duration-300"
        aria-label="Chat on WhatsApp"
      >
        <FaWhatsapp size={28} />
      </a>
    </div>
  );
}
