"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Download } from "lucide-react";
import { getWhatsAppLink } from "@/config/contact";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why MBGo", href: "#why-mbgo" },
  { label: "Safety", href: "#safety" },
  {
    label: "For Partners",
    href: "/mbconnect",
    badge: "MBConnect",
  },
  { label: "Contact Us", href: "/contact-us" },
];

export default function MBGoNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const overlay = !scrolled;

  return (
    <header
      id="top"
      className={`w-full fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm py-2.5"
          : "bg-transparent py-3.5"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <Link href="/mbgo" className="flex items-center group flex-shrink-0">
          <Image
            src="/partner/mbgoLogo_transparent.png"
            alt="MBGo by MusafirBaba"
            width={140}
            height={44}
            className={`h-9 md:h-10 w-auto object-contain transition-all ${
              overlay ? "drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]" : ""
            }`}
            priority
          />
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden lg:flex items-center gap-5 xl:gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-[14px] xl:text-[14.5px] transition-colors flex items-center gap-1.5 ${
                link.label === "Home"
                  ? overlay
                    ? "text-white font-bold drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
                    : "text-[#FE5300] font-bold"
                  : overlay
                  ? "text-white/95 font-semibold hover:text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]"
                  : "text-gray-800 font-semibold hover:text-[#FE5300]"
              }`}
            >
              <span>{link.label}</span>
              {link.badge && (
                <span
                  className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md transition-colors ${
                    overlay
                      ? "bg-emerald-500/25 text-emerald-300 border border-emerald-400/50 backdrop-blur-xs drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-2xs"
                  }`}
                >
                  {link.badge}
                </span>
              )}
            </a>
          ))}
        </nav>

        {/* Right Action: Download App CTA */}
        <a
          href={getWhatsAppLink("Hi! I would like to download the MBGo app and book a ride.")}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="hidden lg:flex items-center gap-2 bg-[#FE5300] hover:bg-[#e04800] text-white text-[13.5px] font-bold px-4 xl:px-5 py-2.5 rounded-lg shadow-md shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95 flex-shrink-0"
        >
          Download App <Download className="w-4 h-4" />
        </a>

        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`lg:hidden p-2 -mr-2 transition-colors rounded-lg ${
            overlay ? "text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]" : "text-gray-800 hover:text-[#FE5300]"
          }`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Drawer Menu */}
      {menuOpen && (
        <nav className="lg:hidden border-t border-gray-100 px-4 py-4 flex flex-col gap-1.5 bg-white/98 backdrop-blur-md shadow-lg animate-in slide-in-from-top-2 duration-200">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-[14.5px] font-semibold py-2.5 px-3 rounded-lg flex items-center justify-between transition-colors ${
                link.label === "Home"
                  ? "text-[#FE5300] bg-orange-50/80 font-bold"
                  : "text-gray-800 hover:bg-gray-50"
              }`}
            >
              <span>{link.label}</span>
              {link.badge && (
                <span className="text-[10.5px] font-extrabold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {link.badge}
                </span>
              )}
            </a>
          ))}
          <a
            href={getWhatsAppLink("Hi! I would like to download the MBGo app and book a ride.")}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#FE5300] text-white text-[14px] font-bold px-5 py-3 rounded-xl mt-2 shadow-sm"
          >
            Download App <Download className="w-4 h-4" />
          </a>
        </nav>
      )}
    </header>
  );
}
