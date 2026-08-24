"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, Download } from "lucide-react";
import { getWhatsAppLink } from "@/config/contact";

const NAV_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Why MBConnect", href: "#why-mbconnect" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Benefits", href: "#benefits" },
  { label: "Requirements", href: "#requirements" },
  { label: "FAQs", href: "#faqs" },
  { label: "Contact Us", href: "/contact-us" },
];

export default function MBConnectNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  // Transparent over the hero photo until the visitor scrolls past it —
  // same pattern as the homepage's Header.tsx (isHome/scrolled/overlay).
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
      className={`w-full fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        overlay
          ? "bg-gradient-to-b from-black/50 via-black/20 to-transparent border-b border-transparent"
          : "bg-white border-b border-gray-100 shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link href="/mbconnect" className="block w-36 md:w-40 flex-shrink-0">
          <Image
            src="/partner/mbconnect.avif"
            alt="MBConnect by MusafirBaba"
            width={1384}
            height={345}
            style={{ width: "100%", height: "auto" }}
            className={overlay ? "drop-shadow-[0_2px_6px_rgba(0,0,0,0.45)]" : ""}
            priority
          />
        </Link>

        <nav className="hidden xl:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className={`text-[14px] font-medium transition-colors ${
                link.label === "Home"
                  ? overlay
                    ? "text-white border-b-2 border-white pb-1"
                    : "text-[#FE5300] border-b-2 border-[#FE5300] pb-1"
                  : overlay
                  ? "text-white/90 hover:text-white"
                  : "text-gray-700 hover:text-[#FE5300]"
              }`}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <a
          href={getWhatsAppLink("Hi, I'd like to join MBConnect as a driver partner.")}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="hidden xl:flex items-center gap-2 bg-[#FE5300] hover:bg-[#e04800] text-white text-[13.5px] font-bold px-5 py-2.5 rounded-lg transition-colors"
        >
          Download App <Download className="w-4 h-4" />
        </a>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          className={`xl:hidden p-2 -mr-2 transition-colors ${overlay ? "text-white" : "text-gray-700"}`}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {menuOpen && (
        <nav className="xl:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-1 bg-white">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className={`text-[14px] font-medium py-2.5 px-2 rounded-md ${
                link.label === "Home" ? "text-[#FE5300] bg-orange-50" : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {link.label}
            </a>
          ))}
          <a
            href={getWhatsAppLink("Hi, I'd like to join MBConnect as a driver partner.")}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center justify-center gap-2 bg-[#FE5300] text-white text-[13.5px] font-bold px-5 py-2.5 rounded-lg mt-2"
          >
            Download App <Download className="w-4 h-4" />
          </a>
        </nav>
      )}
    </header>
  );
}
