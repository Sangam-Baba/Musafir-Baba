"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_LINKS } from "@/config/navLinks";

export function Navbar({
  onClose,
  variant = "light",
}: {
  onClose?: () => void;
  variant?: "light" | "dark";
}) {
  const pathname = usePathname();
  const isDark = variant === "dark";

  return (
    <nav className="flex lg:items-center w-full">
      <ul className="flex flex-col md:flex-row lg:items-center md:gap-6 gap-6 lg:gap-8 w-full justify-center">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <li
              key={link.label}
              className="relative group/nav-item font-medium text-[15px] py-2 md:py-3"
            >
              <Link
                onClick={onClose}
                href={link.href}
                className={`flex items-center gap-1 transition-colors ${
                  isDark
                    ? "text-white hover:text-[#FE5300] drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)] font-semibold"
                    : "text-gray-800 hover:text-[#FE5300]"
                }`}
              >
                {link.label}
                {link.dropdown && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 group-hover/nav-item:rotate-180 ${
                      isDark ? "text-white/90" : "opacity-70"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </Link>

              {/* Active / Hover Bottom Border */}
              <div
                className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#FE5300] rounded-t-sm transition-all duration-300 ${
                  isActive
                    ? "opacity-100"
                    : "opacity-0 group-hover/nav-item:opacity-100"
                }`}
              />

              {/* Dropdown: always in the DOM as real links, so it's crawlable
                  and keyboard-usable without depending on JS to reveal it */}
              {link.dropdown && (
                <div
                  className="invisible opacity-0 translate-y-1 pointer-events-none
                    group-hover/nav-item:visible group-hover/nav-item:opacity-100 group-hover/nav-item:translate-y-0 group-hover/nav-item:pointer-events-auto
                    group-focus-within/nav-item:visible group-focus-within/nav-item:opacity-100 group-focus-within/nav-item:translate-y-0 group-focus-within/nav-item:pointer-events-auto
                    transition-all duration-150 absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50"
                >
                  <ul className="bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[210px]">
                    {link.dropdown.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-4 py-2 text-[13.5px] text-gray-700 hover:bg-orange-50 hover:text-[#FE5300] transition-colors group/item"
                          >
                            {item.emoji ? (
                              <span className="text-[15px] leading-none flex-shrink-0" aria-hidden="true">
                                {item.emoji}
                              </span>
                            ) : Icon ? (
                              <Icon className="w-4 h-4 text-gray-400 group-hover/item:text-[#FE5300] transition-colors flex-shrink-0" />
                            ) : null}
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
