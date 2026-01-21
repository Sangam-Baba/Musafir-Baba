// components/custom/Sidebar.tsx
"use client";
import React, { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import { Navbar } from "../common/Navbar";
import { useUIStore } from "@/store/useUIStore";
import { Button } from "../ui/button";
import Link from "next/link";

export default function Sidebar() {
  const { toggleSidebar, closeSidebar } = useUIStore();

  // close on Escape and lock body scroll while sidebar open
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    document.addEventListener("keydown", onKey);

    // lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
    };
  }, [closeSidebar]);

  return (
    // overlay + sidebar container
    <div className="fixed inset-0 z-50  flex">
      {/* Backdrop / overlay */}
      <button
        aria-label="Close menu"
        onClick={closeSidebar}
        className="absolute inset-0 bg-black/40"
      />

      {/* Sidebar panel */}
      <aside
        role="dialog"
        aria-modal="true"
        className="relative z-10 w-3/4 max-w-xs  bg-[#FFFFFF] h-full transform transition-transform duration-300 ease-in-out"
      >
        <div className="flex items-center justify-between px-4 py-3">
          <h3 className="font-semibold text-lg">Menu</h3>
          <button
            aria-label="Close sidebar"
            onClick={toggleSidebar}
            className="p-2 rounded-md hover:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>

        <nav className="px-4 py-2">
          <Navbar onClose={closeSidebar} />
        </nav>
        <Button className="mx-4 my-2 md:hidden bg-gradient-to-r from-[#eb3b23] to-[#f8b914] hover:bg-[#FE5300] text-white">
          <Link href="https://payu.in/invoice/56FFB3A783C36FD0D432CEFB61FCE2A77E7188F585220534625FAFB9C5BA7A91/3A149C292C19880543705B6135EFBDB1">
            Pay Now
          </Link>
        </Button>
      </aside>

      {/* For larger screens, keep the rest clickable/hidden by overlay; layout uses absolute overlay above */}
    </div>
  );
}
