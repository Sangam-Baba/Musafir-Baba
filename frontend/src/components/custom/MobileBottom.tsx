import { Phone } from "lucide-react";
import Link from "next/link";
import React from "react";
import { FaWhatsapp } from "react-icons/fa";
import { SquarePen } from "lucide-react";
import { Dialog } from "@radix-ui/react-dialog";
import { DialogContent, DialogTrigger } from "../ui/dialog";
import QueryForm from "./QueryForm";
function MobileBottom() {
  const whatsappNumber = "919289602447";

  const whatsappLink = `https://wa.me/${whatsappNumber}`;
  return (
    <div className="block md:hidden fixed bottom-0 z-50 flex items-center px-10 py-2 justify-between w-full bg-white border-t border-gray-400 ">
      <div>
        <Link
          href="tel:+919289602447"
          className="flex items-center justify-center py-1  text-white rounded-lg"
        >
          <Phone className="w-10 h-8 text-primary" color="#FE5300" />
        </Link>
      </div>

      <a
        href={whatsappLink}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat on WhatsApp"
      >
        <FaWhatsapp size={40} color="green" />
      </a>
      <div>
        <Dialog>
          <DialogTrigger asChild>
            <SquarePen color="#FE5300" className="w-10 h-8 text-primary" />
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <QueryForm />
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default MobileBottom;
