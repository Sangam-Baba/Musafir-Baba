"use client";

import { useState } from "react";
import { Phone } from "lucide-react";
import Link from "next/link";
import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { SquarePen } from "lucide-react";
import { Dialog } from "@radix-ui/react-dialog";
import { DialogContent, DialogTrigger } from "../ui/dialog";
import LazyQueryForm from "./LazyQueryForm";
import { CONTACT_INFO, getWhatsAppLink } from "@/config/contact";

function MobileBottom() {
  const [isOpen, setIsOpen] = useState(false);
  const whatsappLink = getWhatsAppLink();
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-[65] grid grid-cols-3 w-full h-[65px] bg-white border-t border-gray-100 shadow-[0_-8px_20px_rgba(0,0,0,0.05)] pb-safe">
      <Link
        href={`tel:${CONTACT_INFO.PHONE_NUMBER}`}
        className="flex flex-row items-end justify-center pb-1.5 h-full transition-colors hover:bg-gray-50 relative"
      >
        <div className="flex flex-col items-center justify-end h-full w-full">
          <Phone className="w-[22px] h-[22px] text-gray-500 mb-1" />
          <span className="text-[10px] font-bold text-gray-500 leading-none">Call Us</span>
        </div>
      </Link>

      <a
        href={whatsappLink}
        target="_blank"
        rel="nofollow noopener noreferrer"
        aria-label="Chat on WhatsApp"
        className="flex flex-col items-center justify-end pb-1.5 h-full relative"
      >
        <div className="absolute -top-4 w-12 h-12 bg-[#25D366] rounded-full flex items-center justify-center shadow-md shadow-[#25D366]/30 border-[3px] border-white transition-transform active:scale-95">
          <FaWhatsapp size={24} color="white" />
        </div>
        <span className="text-[10px] font-bold text-gray-500 leading-none">WhatsApp</span>
      </a>

      <Dialog onOpenChange={setIsOpen}>
        <DialogTrigger className="flex flex-col items-center justify-end pb-1.5 h-full outline-none transition-colors hover:bg-gray-50">
          <SquarePen className="w-[22px] h-[22px] text-gray-500 mb-1" />
          <span className="text-[10px] font-bold text-gray-500 leading-none">Enquire</span>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[480px] p-0 border-none shadow-none bg-transparent z-[100]">
          {isOpen && <LazyQueryForm />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default MobileBottom;
