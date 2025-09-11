// components/common/Header.tsx
"use client";
import React from "react";
import { Navbar } from "./Navbar";
import Sidebar from "../custom/Sidebar";
import { useUIStore } from "@/store/useUIStore";
import { AccountIcon } from "../custom/AccountIcon";
import { Youtube, Facebook, LucideTwitter, Instagram, Linkedin, Menu ,Phone } from "lucide-react";
import logo from "../../../public/logo.svg";
import Image from "next/image";

export default function Header() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header className="w-full">

      <div className="hidden md:flex justify-between items-center w-full px-8 py-4 bg-[#FE5300] text-white">
        <div className="flex gap-6 items-center">
          <Youtube  className="w-5 h-5" />
          <Facebook fill="white" className="w-5 h-5" />
          <LucideTwitter fill="white" className="w-5 h-5" />
          <Instagram  className="w-5 h-5" />
          <Linkedin fill="white" className="w-5 h-5" />
        </div>
        <div className="flex gap-2 items-center text-sm font-medium"><Phone fill="white" className="w-5 h-5" /> +91-92896 02447</div>
      </div>


      <div className="flex items-center justify-between w-full md:px-10 px-4 py-4">
        {/* Left: Menu (mobile) or logo (desktop) */}
        <div className="flex justify-around items-center gap-4 w-full">
          {/* Mobile: Menu button for <md */}
          <button
            aria-label="Open menu"
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md hover:bg-yellow-100"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* Logo - center on mobile, left on md+ */}
          <div className="flex items-center">
            <Image src={logo} alt="musafir Baba Logo" className="w-40 h-auto" />
          </div>
        

        {/* Center / big screens: Navbar visible from md and up */}
        <nav className="hidden md:flex md:flex-1 md:justify-center">
          <Navbar />
        </nav>

        {/* Right: account icon */}
        <div className="flex items-center">
          <AccountIcon />
        </div>
        </div>
      </div>

      {sidebarOpen && <Sidebar />}
    </header>
  );
}
