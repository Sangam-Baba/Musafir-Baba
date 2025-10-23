"use client";
import React from "react";
import { FaWhatsapp } from "react-icons/fa";

export default function WhatsAppButton() {
  const whatsappNumber = "919289602447";

  const whatsappLink = `https://wa.me/${whatsappNumber}`;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2">
      {/* Chat bubble */}
      <div className="relative bg-green-100 text-green-800 text-sm font-medium px-3 py-2 rounded-xl shadow-md">
        Ask to Baba
        {/* Tail (triangle pointer) */}
        <div className="absolute right-[-6px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-6 border-t-transparent border-b-6 border-b-transparent border-l-6 border-l-green-100"></div>
      </div>
      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-lg transition duration-300"
        aria-label="Chat on WhatsApp"
      >
        <FaWhatsapp size={28} />
      </a>
    </div>
  );
}
