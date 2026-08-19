"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./Navbar";
import Sidebar from "../custom/Sidebar";
import { useUIStore } from "@/store/useUIStore";
import { AccountIcon } from "../custom/AccountIcon";
import {
  Youtube,
  Facebook,
  LucideTwitter,
  Instagram,
  Linkedin,
  Menu,
  Phone,
  Search,
} from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import logo from "../../../public/logo.png";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import GlobalSearch from "../global-search/GlobalSearch";
import { CONTACT_INFO, getWhatsAppLink } from "@/config/contact";

export default function Header() {
  const { sidebarOpen, toggleSidebar } = useUIStore();
  const [isSearchOpen, setIsSearchOpen] = React.useState(false);

  // Transparent-over-hero blend only ever applies on the homepage, and only
  // until the visitor scrolls past the hero. Every other route always takes
  // the `else` branch below, which renders the exact solid header markup
  // this file has always rendered — nothing about other pages changes.
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const overlay = isHome && !scrolled;

  return (
    <header
      className={`w-full z-50 ${isHome ? "fixed top-0 left-0 right-0 transition-colors duration-300" : ""} ${
        overlay
          ? "bg-gradient-to-b from-black/60 via-black/25 to-transparent border-b border-transparent"
          : "bg-white border-b border-gray-200"
      }`}
    >
      {overlay ? (
        /* ===== SINGLE-ROW TRANSPARENT NAV (homepage hero only) =====
           A dedicated, self-contained layout — not a restyled version of
           the two-row block below — so the solid header's markup (right
           below, in the `else` branch) is never touched by this state.
           Social links / Pay Now / Login aren't shown in this specific
           transient window; they're one scroll (40px) or one navigation
           away via the solid header, not removed from the app. */
        <div className="w-full flex items-center justify-between px-4 md:px-10 py-3">
          {/* Mobile menu */}
          <button
            aria-label="Open menu"
            onClick={toggleSidebar}
            className="md:hidden p-2 -ml-2 rounded-md text-white hover:bg-white/10 transition"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* LOGO — no background/box, just a soft drop-shadow for legibility
              against the photo (overlay state only; the solid header below
              needs neither). */}
          <div className="flex items-center">
            <Link href="/" className="block w-32 md:w-44">
              <Image
                src={logo}
                alt="Musafir Baba Logo"
                style={{ width: "100%", height: "auto" }}
                className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
                priority
              />
            </Link>
          </div>

          {/* NAVBAR (desktop only) */}
          <nav className="hidden md:flex flex-1 justify-center self-stretch mx-6">
            <Navbar variant="dark" />
          </nav>

          {/* Call + WhatsApp */}
          <div className="hidden md:flex items-center gap-4">
            <a
              href={`tel:${CONTACT_INFO.PHONE_NUMBER}`}
              className="flex items-center gap-2 text-white hover:text-white/80 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="flex flex-col leading-tight text-left">
                <span className="text-[10px] text-white/70">Call Us</span>
                <span className="text-[13px] font-semibold tracking-wide">
                  {CONTACT_INFO.PHONE_NUMBER_FORMATTED}
                </span>
              </span>
            </a>
            <a
              href={getWhatsAppLink()}
              target="_blank"
              rel="nofollow noopener noreferrer"
              aria-label="Chat on WhatsApp"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white transition-colors flex-shrink-0"
            >
              <FaWhatsapp size={18} />
            </a>
          </div>
        </div>
      ) : (
        <>
          {/* ===== TOP BAR ===== */}
          <div className="hidden md:flex justify-between items-center w-full md:px-10 px-4 py-2 bg-gradient-to-r from-[#e84118] via-[#FE5300] to-[#f39c12]">
            {/* Social Links */}
            <div className="flex items-center gap-4 text-white">
              <Link href="https://www.youtube.com/@musafirbabatravels" aria-label="YouTube" className="flex items-center justify-center"><Youtube className="w-[18px] h-[18px] hover:scale-110 transition-transform" /></Link>
              <Link href="http://facebook.com/hellomusafirbaba" aria-label="Facebook" className="flex items-center justify-center"><Facebook className="w-[18px] h-[18px] hover:scale-110 transition-transform" /></Link>
              <Link href="https://x.com/itsmusafirbaba" aria-label="Twitter" className="flex items-center justify-center"><LucideTwitter className="w-[18px] h-[18px] hover:scale-110 transition-transform" /></Link>
              <Link href="https://www.instagram.com/hello_musafirbaba" aria-label="Instagram" className="flex items-center justify-center"><Instagram className="w-[18px] h-[18px] hover:scale-110 transition-transform" /></Link>
              <Link href="https://in.linkedin.com/company/musafirbaba" aria-label="LinkedIn" className="flex items-center justify-center"><Linkedin className="w-[18px] h-[18px] hover:scale-110 transition-transform" /></Link>
            </div>

            {/* Contact & Actions */}
            <div className="flex gap-4 items-center text-sm font-medium">
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href={`tel:${CONTACT_INFO.PHONE_NUMBER}`}
                    className="flex items-center gap-1.5 text-white hover:text-white/80 transition-colors"
                  >
                    <Phone className="w-4 h-4 text-white" />
                    <span className="pt-[1px] tracking-wide font-semibold">{CONTACT_INFO.PHONE_NUMBER_FORMATTED}</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Talk to our travel experts</p>
                </TooltipContent>
              </Tooltip>

              <div className="flex items-center gap-3 ml-2">
                <Button
                  asChild
                  className="hidden md:flex h-8 px-5 rounded-md font-bold text-[#d35400] bg-white hover:bg-gray-100 transition-all shadow-sm"
                >
                  <Link href="https://payu.in/invoice/56FFB3A783C36FD0D432CEFB61FCE2A77E7188F585220534625FAFB9C5BA7A91/3A149C292C19880543705B6135EFBDB1">
                    Pay Now
                  </Link>
                </Button>

                <AccountIcon />
              </div>
            </div>
          </div>

          {/* ===== MAIN NAVIGATION BAR ===== */}
          <div className="w-full bg-white flex items-center justify-between md:px-10 px-4 py-2 md:py-0">
            <div className="flex md:justify-between items-center w-full md:gap-4 lg:gap-8">
              {/* Mobile menu */}
              <button
                aria-label="Open menu"
                onClick={toggleSidebar}
                className="md:hidden p-2 rounded-md hover:bg-black/10 transition"
              >
                <Menu className="w-6 h-6" />
              </button>

              {/* LOGO */}
              <div className="flex items-center ml-2 md:ml-0 py-2 md:py-4">
                <Link href="/" className="block w-32 md:w-44">
                  <Image
                    src={logo}
                    alt="Musafir Baba Logo"
                    style={{ width: '100%', height: 'auto' }}
                    priority
                  />
                </Link>
              </div>

              {/* NAVBAR (desktop only) */}
              <nav className="hidden md:flex md:flex-1 md:justify-center self-stretch">
                <Navbar variant="light" />
              </nav>

              {/* Right side search */}
              <div className="hidden md:flex items-center gap-3 py-2 md:py-4">
                <button
                  onClick={() => setIsSearchOpen(true)}
                  className="flex items-center gap-2 bg-white text-gray-500 px-4 py-2 rounded-md border border-gray-300 hover:border-gray-400 hover:shadow-sm transition-all w-48 lg:w-64"
                  aria-label="Open search"
                >
                  <Search className="w-4 h-4 text-gray-500" />
                  <span className="text-[14px] font-normal truncate">Search destinations...</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {sidebarOpen && <Sidebar />}

      {/* SEARCH POPUP MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 md:px-0 bg-black/60 backdrop-blur-sm transition-opacity">
          {/* Backdrop (click to close) */}
          <div 
            className="absolute inset-0 cursor-pointer" 
            onClick={() => setIsSearchOpen(false)}
            aria-label="Close search"
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-3xl animate-in fade-in slide-in-from-top-10 duration-200">
            <GlobalSearch />
            
            {/* Mobile close hint */}
            <div className="text-center mt-4 md:hidden">
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="px-4 py-2 bg-white/20 text-white rounded-full text-sm backdrop-blur-md border border-white/30"
              >
                Close Search
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
