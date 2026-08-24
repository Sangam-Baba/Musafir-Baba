import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Facebook, Instagram, Youtube, Linkedin } from "lucide-react";
import { GooglePlayButton, AppStoreButton } from "./MBGoAppBadges";

const QUICK_LINKS = [
  { label: "Home", href: "#top" },
  { label: "Services", href: "#services" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Why MBGo", href: "#why-mbgo" },
  { label: "Safety", href: "#safety" },
  { label: "Contact Us", href: "/contact-us" },
];

const SERVICES = [
  { label: "Local Rides", href: "/rental" },
  { label: "Outstation Trips", href: "/rental" },
  { label: "Airport Transfers", href: "/rental" },
  { label: "Car Rentals", href: "/rental" },
  { label: "Corporate Travel", href: "/contact-us" },
];

const SUPPORT = [
  { label: "Help Center", href: "/contact-us" },
  { label: "Terms & Conditions", href: "/terms-and-conditions" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Cancellation Policy", href: "/cancellation-and-refund" },
];

export default function MBGoFooter() {
  return (
    <footer className="w-full bg-[#FAFAFA] border-t border-gray-200/70 mt-auto">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-16 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 lg:gap-6 xl:gap-8">
        {/* Column 1: Brand Info */}
        <div className="flex flex-col gap-3.5 sm:col-span-2 md:col-span-1">
          <Link href="/mbgo" className="flex items-center group">
            <Image
              src="/partner/mbgoLogo_transparent.png"
              alt="MBGo by MusafirBaba"
              width={140}
              height={44}
              className="h-9 md:h-10 w-auto object-contain"
            />
          </Link>

          <p className="text-[12.5px] text-gray-500 leading-relaxed max-w-[240px]">
            MBGo is a smart mobility app by MusafirBaba that makes every journey simple, safe and memorable.
          </p>

          <div className="flex items-center gap-2.5 mt-1">
            <Link
              href="https://facebook.com/hellomusafirbaba"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Facebook"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-[#FE5300] text-gray-800 flex items-center justify-center transition-colors shadow-xs"
            >
              <Facebook className="w-4 h-4 fill-current" />
            </Link>
            <Link
              href="https://www.instagram.com/hello_musafirbaba"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-[#FE5300] text-gray-800 flex items-center justify-center transition-colors shadow-xs"
            >
              <Instagram className="w-4 h-4" />
            </Link>
            <Link
              href="https://www.youtube.com/@musafirbabatravels"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="YouTube"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-[#FE5300] text-gray-800 flex items-center justify-center transition-colors shadow-xs"
            >
              <Youtube className="w-4 h-4 fill-current" />
            </Link>
            <Link
              href="https://in.linkedin.com/company/musafirbaba"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn"
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-orange-50 hover:text-[#FE5300] text-gray-800 flex items-center justify-center transition-colors shadow-xs"
            >
              <Linkedin className="w-4 h-4 fill-current" />
            </Link>
          </div>
        </div>

        {/* Column 2: Quick Links */}
        <div>
          <p className="text-[13.5px] font-bold text-gray-900 mb-3.5 tracking-tight">Quick Links</p>
          <ul className="flex flex-col gap-2">
            {QUICK_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={link.href}
                  className="text-[13px] text-gray-600 hover:text-[#FE5300] transition-colors"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 3: Services */}
        <div>
          <p className="text-[13.5px] font-bold text-gray-900 mb-3.5 tracking-tight">Services</p>
          <ul className="flex flex-col gap-2">
            {SERVICES.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="text-[13px] text-gray-600 hover:text-[#FE5300] transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 4: Support */}
        <div>
          <p className="text-[13.5px] font-bold text-gray-900 mb-3.5 tracking-tight">Support</p>
          <ul className="flex flex-col gap-2">
            {SUPPORT.map((item) => (
              <li key={item.label}>
                <Link
                  href={item.href}
                  className="text-[13px] text-gray-600 hover:text-[#FE5300] transition-colors"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column 5: Download MBGo App */}
        <div className="sm:col-span-2 md:col-span-1">
          <p className="text-[13.5px] font-bold text-gray-900 mb-3.5 tracking-tight">
            Download MBGo App
          </p>
          <div className="flex flex-col gap-2.5">
            <GooglePlayButton />
            <AppStoreButton />
          </div>
        </div>
      </div>

      {/* Bottom copyright line */}
      <div className="border-t border-gray-200/60 py-6 px-4 text-center">
        <p className="text-[12.5px] text-gray-500">
          © {new Date().getFullYear()} MusafirBaba Travels Pvt. Ltd. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
}
