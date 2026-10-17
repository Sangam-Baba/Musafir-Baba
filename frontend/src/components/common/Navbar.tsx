"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { NAV_LINKS } from "@/config/navLinks";

export function Navbar({
  onClose,
  variant = "light",
  mobile = false,
}: {
  onClose?: () => void;
  variant?: "light" | "dark";
  // Touch screens have no hover, so the desktop group-hover dropdown below
  // never reveals -- tapping the label just navigates away immediately.
  // When true, renders an accordion-style tap-to-expand dropdown instead,
  // only for the Sidebar's instance of this component (desktop instances
  // never pass this, so their markup/behavior is untouched).
  mobile?: boolean;
}) {
  const pathname = usePathname();
  const isDark = variant === "dark";
  const [openLabel, setOpenLabel] = useState<string | null>(null);
  // Desktop only: after a click, the clicked link keeps focus, so the
  // group-focus-within rule kept the dropdown open after navigating away
  // (and group-hover kept it open while the cursor was still over it).
  // Blur the link and hold that item's dropdown closed until the pointer
  // leaves it (or keyboard focus re-enters), so hover/keyboard still work.
  const [dismissedLabel, setDismissedLabel] = useState<string | null>(null);
  const dismissOnClick =
    (label: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
      e.currentTarget.blur();
      setDismissedLabel(label);
      onClose?.();
    };

  if (mobile) {
    return (
      <nav className="flex w-full">
        <ul className="flex flex-col w-full">
          {NAV_LINKS.map((link) => {
            const isActive =
              pathname === link.href || pathname?.startsWith(`${link.href}/`);
            const isOpen = openLabel === link.label;
            return (
              <li key={link.label} className="font-medium text-[15px]">
                <div className="flex items-center justify-between">
                  <Link
                    onClick={onClose}
                    href={link.href}
                    className={`flex-1 flex items-center gap-2 py-2 transition-colors active:text-[#FE5300] ${
                      isActive ? "text-[#FE5300]" : "text-gray-800 hover:text-[#FE5300]"
                    }`}
                  >
                    {link.icon && (
                      <link.icon className="w-[18px] h-[18px] text-[#FE5300] flex-shrink-0" aria-hidden="true" />
                    )}
                    {link.label}
                  </Link>
                  {link.dropdown && (
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Collapse" : "Expand"} ${link.label} menu`}
                      onClick={() => setOpenLabel(isOpen ? null : link.label)}
                      className="p-2 -mr-2 rounded-full transition-colors active:bg-orange-50"
                    >
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </button>
                  )}
                </div>

                {/* Dropdown: always in the DOM as real links, so it's
                    crawlable and keyboard-usable without depending on JS */}
                {link.dropdown && (
                  <ul
                    className={`${isOpen ? "block" : "hidden"} pl-3 pb-2 border-l border-gray-100 ml-1`}
                  >
                    {link.dropdown.map((item) => {
                      const Icon = item.icon;
                      return (
                        <li key={item.label}>
                          <Link
                            href={item.href}
                            onClick={onClose}
                            className="flex items-center gap-2.5 px-2 py-2 text-[13.5px] text-gray-700 hover:text-[#FE5300] active:bg-orange-50 active:text-[#FE5300] rounded-md transition-colors"
                          >
                            {item.emoji ? (
                              <span className="text-[15px] leading-none flex-shrink-0" aria-hidden="true">
                                {item.emoji}
                              </span>
                            ) : Icon ? (
                              <span className="w-7 h-7 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                                <Icon className="w-4 h-4 text-[#FE5300]" />
                              </span>
                            ) : null}
                            <span className="truncate">{item.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </nav>
    );
  }

  return (
    <nav className="flex lg:items-center w-full">
      <ul className="flex flex-col md:flex-row lg:items-center md:gap-6 gap-6 lg:gap-8 w-full justify-center">
        {NAV_LINKS.map((link) => {
          const isActive =
            pathname === link.href || pathname?.startsWith(`${link.href}/`);
          const isDismissed = dismissedLabel === link.label;
          return (
            <li
              key={link.label}
              className="relative group/nav-item font-medium text-[15px] py-2 md:py-3"
              onMouseLeave={isDismissed ? () => setDismissedLabel(null) : undefined}
              onFocus={isDismissed ? () => setDismissedLabel(null) : undefined}
            >
              <Link
                onClick={dismissOnClick(link.label)}
                href={link.href}
                className={`flex items-center gap-1 transition-all active:scale-95 ${
                  isDark
                    ? "text-black hover:text-[#FE5300] active:text-[#FE5300] font-semibold"
                    : "text-gray-800 hover:text-[#FE5300] active:text-[#FE5300]"
                }`}
              >
                {link.icon &&
                  (isDark ? (
                    // Over the hero photo a bare orange line icon blends into
                    // the sky, so give it a solid white tile for contrast.
                    <span
                      className="w-7 h-7 mr-1 rounded-lg bg-white/95 shadow-[0_2px_8px_rgba(0,0,0,0.18)] flex items-center justify-center flex-shrink-0"
                      aria-hidden="true"
                    >
                      <link.icon className="w-[17px] h-[17px] text-[#FE5300]" />
                    </span>
                  ) : (
                    <link.icon className="w-[19px] h-[19px] mr-0.5 text-[#FE5300] flex-shrink-0" aria-hidden="true" />
                  ))}
                {link.label}
                {link.dropdown && (
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 ${isDismissed ? "" : "group-hover/nav-item:rotate-180"} ${
                      isDark ? "text-black/80" : "opacity-70"
                    }`}
                    aria-hidden="true"
                  />
                )}
              </Link>

              {/* Active / Hover Bottom Border (light mode only) */}
              {!isDark && (
                <div
                  className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#FE5300] rounded-t-sm transition-all duration-300 ${
                    isActive
                      ? "opacity-100"
                      : "opacity-0 group-hover/nav-item:opacity-100"
                  }`}
                />
              )}

              {/* Dropdown: always in the DOM as real links, so it's crawlable
                  and keyboard-usable without depending on JS to reveal it */}
              {link.dropdown && (
                <div
                  className={`invisible opacity-0 scale-95 translate-y-1 pointer-events-none
                    ${isDismissed ? "" : `group-hover/nav-item:visible group-hover/nav-item:opacity-100 group-hover/nav-item:scale-100 group-hover/nav-item:translate-y-0 group-hover/nav-item:pointer-events-auto
                    group-focus-within/nav-item:visible group-focus-within/nav-item:opacity-100 group-focus-within/nav-item:scale-100 group-focus-within/nav-item:translate-y-0 group-focus-within/nav-item:pointer-events-auto`}
                    origin-top transition-all duration-200 ease-[cubic-bezier(0.34,1.56,0.64,1)] absolute left-1/2 -translate-x-1/2 top-full pt-2 z-50`}
                >
                  <ul className="bg-white rounded-xl shadow-lg border border-gray-100 py-2 min-w-[220px]">
                    {link.dropdown.map((item, index) => {
                      const Icon = item.icon;
                      const isViewAll = item.label.toLowerCase().startsWith("view all");
                      // Each item fades/slides in slightly after the last,
                      // cascading down the list once the dropdown opens —
                      // same group-hover/focus-within triggers as the outer
                      // panel above, just with a per-item delay so they
                      // don't all land at once.
                      const staggerStyle = { transitionDelay: `${index * 35}ms` };
                      const staggerClasses =
                        "opacity-0 -translate-y-1 group-hover/nav-item:opacity-100 group-hover/nav-item:translate-y-0 group-focus-within/nav-item:opacity-100 group-focus-within/nav-item:translate-y-0 transition-all duration-200 ease-out";

                      if (isViewAll) {
                        return (
                          <li key={item.label} style={staggerStyle} className={`mt-1 pt-1 border-t border-gray-100 px-1.5 ${staggerClasses}`}>
                            <Link
                              href={item.href}
                              onClick={dismissOnClick(link.label)}
                              className="flex items-center justify-between gap-2 px-3 py-2 text-[13px] font-bold text-[#FE5300] bg-orange-50/80 hover:bg-[#FE5300] hover:text-white active:bg-[#e04a00] active:text-white active:scale-[0.97] rounded-lg transition-all group/item shadow-2xs"
                            >
                              <span className="flex items-center gap-2">
                                {Icon && (
                                  <Icon className="w-4 h-4 text-[#FE5300] group-hover/item:text-white transition-colors flex-shrink-0" aria-hidden="true" />
                                )}
                                <span>{item.label}</span>
                              </span>
                              <span className="text-[12px] group-hover/item:translate-x-0.5 transition-transform">→</span>
                            </Link>
                          </li>
                        );
                      }

                      return (
                        <li key={item.label} style={staggerStyle} className={staggerClasses}>
                          <Link
                            href={item.href}
                            onClick={dismissOnClick(link.label)}
                            className="flex items-center gap-2.5 px-4 py-1.5 text-[13.5px] text-gray-700 hover:bg-orange-50 hover:text-[#FE5300] active:bg-orange-100 transition-colors group/item"
                          >
                            {item.emoji ? (
                              <span className="text-[15px] leading-none flex-shrink-0" aria-hidden="true">
                                {item.emoji}
                              </span>
                            ) : Icon ? (
                              <span className="w-7 h-7 rounded-lg bg-orange-50 group-hover/item:bg-[#FE5300] flex items-center justify-center flex-shrink-0 transition-colors" aria-hidden="true">
                                <Icon className="w-4 h-4 text-[#FE5300] group-hover/item:text-white transition-colors" />
                              </span>
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
