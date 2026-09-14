"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, X, Download, LogOut } from "lucide-react";
import { getWhatsAppLink } from "@/config/contact";
import { useRiderAuthStore } from "@/store/useRiderAuthStore";
import { logoutRider } from "@/lib/riderAuthApi";

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
  const pathname = usePathname();
  // The transparent/white-text "overlay" look only makes sense on top of the
  // homepage's dark hero image. Every other MBGo page has a plain light
  // background, so the navbar must always render in its solid (scrolled)
  // style there — otherwise the links/logo render white-on-white.
  const isHeroPage = pathname === "/mbgo";

  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const isRiderAuthenticated = useRiderAuthStore((s) => s.isRiderAuthenticated);
  const riderProfile = useRiderAuthStore((s) => s.profile);
  const riderRefreshToken = useRiderAuthStore((s) => s.riderRefreshToken);
  const clearRiderAuth = useRiderAuthStore((s) => s.clearRiderAuth);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRiderLogout = async () => {
    setAccountMenuOpen(false);
    try {
      await logoutRider(riderRefreshToken);
    } catch {
      // Clear the local session regardless of whether the server call succeeded.
    }
    clearRiderAuth();
  };

  const showSolid = !isHeroPage || scrolled;
  const overlay = !showSolid;
  const riderInitial = (riderProfile?.fullName?.trim()?.[0] || "R").toUpperCase();
  const riderFirstName = riderProfile?.fullName?.trim()?.split(" ")[0] || "Rider";

  return (
    <header
      id="top"
      className={`w-full fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        showSolid
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

        {/* Right Actions: Rider account pill (only when logged in) + Download App CTA */}
        <div className="hidden lg:flex items-center gap-3 flex-shrink-0">
          {isRiderAuthenticated && (
            <div className="relative" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((v) => !v)}
                className={`flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border transition-colors ${
                  overlay
                    ? "bg-white/15 border-white/30 text-white backdrop-blur-xs"
                    : "bg-orange-50 border-orange-100 text-gray-900"
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-[#FE5300] text-white text-[11px] font-extrabold flex items-center justify-center">
                  {riderInitial}
                </span>
                <span className="text-[13px] font-bold">{riderFirstName}</span>
              </button>

              {accountMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl border border-gray-100 shadow-lg py-1.5 z-50">
                  <button
                    type="button"
                    onClick={handleRiderLogout}
                    className="w-full flex items-center gap-2 px-3.5 py-2 text-left text-[13px] font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Logout
                  </button>
                </div>
              )}
            </div>
          )}

          <a
            href={getWhatsAppLink("Hi! I would like to download the MBGo app and book a ride.")}
            target="_blank"
            rel="nofollow noopener noreferrer"
            className="flex items-center gap-2 bg-[#FE5300] hover:bg-[#e04800] text-white text-[13.5px] font-bold px-4 xl:px-5 py-2.5 rounded-lg shadow-md shadow-orange-500/30 transition-all hover:scale-[1.02] active:scale-95"
          >
            Download App <Download className="w-4 h-4" />
          </a>
        </div>

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
          {isRiderAuthenticated && (
            <div className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-orange-50 border border-orange-100 mb-1">
              <span className="flex items-center gap-2 text-[13.5px] font-bold text-gray-900">
                <span className="w-6 h-6 rounded-full bg-[#FE5300] text-white text-[11px] font-extrabold flex items-center justify-center">
                  {riderInitial}
                </span>
                {riderFirstName}
              </span>
              <button
                type="button"
                onClick={handleRiderLogout}
                className="flex items-center gap-1 text-[12.5px] font-bold text-gray-600"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          )}
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
