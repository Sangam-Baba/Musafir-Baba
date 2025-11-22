"use client";
import React from "react";
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
} from "lucide-react";
import logo from "../../../public/logo.png";
import Image from "next/image";
import Link from "next/link";
import { Button } from "../ui/button";

export default function Header() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <header className="w-full z-50">
      {/* ===== TOP SOCIAL BAR ===== */}
      <div className="hidden md:flex justify-between items-center w-full px-8 py-3 bg-gradient-to-r from-[#eb3b23] to-[#f8b914] text-white">
        <div className="flex gap-5 items-center">
          <Link href="https://www.youtube.com/@hello_musafirbaba">
            <Youtube className="w-5 h-5" />
          </Link>
          <Link href="http://facebook.com/hellomusafirbaba">
            <Facebook fill="white" className="w-5 h-5" />
          </Link>
          <Link href="https://x.com/itsmusafirbaba">
            <LucideTwitter fill="white" className="w-5 h-5" />
          </Link>
          <Link href="https://www.instagram.com/hello_musafirbaba">
            <Instagram className="w-5 h-5" />
          </Link>
          <Link href="https://in.linkedin.com/company/musafirbaba">
            <Linkedin fill="white" className="w-5 h-5" />
          </Link>
        </div>
        <div className="flex gap-2 items-center text-sm font-medium">
          <a
            href="tel:+919289602447"
            className="flex items-center gap-1 text-inherit"
          >
            <Phone fill="white" className="w-4 h-4" />
            Tour: +91 92896 02447
          </a>

          <span className="mx-1">|</span>

          <a
            href="tel:+919355663591"
            className="flex items-center gap-1 text-inherit"
          >
            Visa: +91 93556 63591
          </a>
        </div>
      </div>

      {/* ===== MAIN NAVIGATION BAR ===== */}
      <div
        className="w-full bg-white/70 shadow-sm md:shadow-none md:bg-transparent 
                      flex items-center justify-between md:px-10 px-4 py-4"
      >
        <div className="flex justify-between items-center w-full">
          {/* Mobile menu */}
          <button
            aria-label="Open menu"
            onClick={toggleSidebar}
            className="md:hidden p-2 rounded-md hover:bg-black/10 transition"
          >
            <Menu className="w-6 h-6" />
          </button>

          {/* LOGO */}
          <div className="flex items-center">
            <Link href="/">
              <Image
                src={logo}
                alt="Musafir Baba Logo"
                className="w-36 h-auto md:w-40 "
                priority
              />
            </Link>
          </div>

          {/* NAVBAR (desktop only) */}
          <nav className="hidden md:flex md:flex-1 md:justify-center">
            <Navbar />
          </nav>

          {/* Right side buttons */}
          <div className="flex items-center gap-3">
            <Button className="hidden md:flex bg-gradient-to-r from-[#eb3b23] to-[#f8b914] hover:bg-[#FE5300] text-white">
              <Link href="https://payu.in/invoice/56FFB3A783C36FD0D432CEFB61FCE2A77E7188F585220534625FAFB9C5BA7A91/3A149C292C19880543705B6135EFBDB1">
                Pay Now
              </Link>
            </Button>

            <AccountIcon />
          </div>
        </div>
      </div>

      {sidebarOpen && <Sidebar />}
    </header>
  );
}
