"use client";

import * as React from "react";
// import { useTheme } from "next-themes";
// import { SunMoon } from 'lucide-react';
import { Button } from "../ui/button";
import Link from "next/link";
import { useAuthStore } from "@/store/useAuthStore";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";
import { useRouter } from "next/navigation";

export function Navbar() {
  const router = useRouter();
  const { openDialog } = useAuthDialogStore();
  const accessToken = useAuthStore((state) => state.accessToken) as string;

  const handleClick = () => {
    if (!accessToken) {
      openDialog("login", undefined, "/plan-my-trip");
      return;
    }
    router.push(`/plan-my-trip`);
  };
  // const { theme, setTheme }= useTheme();
  return (
    <>
      <nav className="flex lg:items-center">
        <ul className="flex flex-col md:flex-row lg:items-center gap-6 lg:gap-8">
          <li className="font-semi-bold  text-[#FE5300]">
            <Link href="/holidays">Holidays</Link>
          </li>
          <li className="font-semi-bold  text-[#FE5300]">
            <Link href="/bookings">Bookings</Link>
          </li>
          <li className="font-semi-bold  text-[#FE5300]">
            <Link href="/visa">Visa</Link>
          </li>
          <li className="font-semi-bold  text-[#FE5300]">
            <Link href="/membership">Membership</Link>
          </li>
          <li className="font-semi-bold bg-[FE5300] text-[#FE5300]">
            <Link href="/blog">Blog</Link>
          </li>
          <li className="font-semi-bold bg-[FE5300] text-[#FE5300]">
            <Link href="/news">News</Link>
          </li>
          <li className="font-semi-bold  text-[#FE5300]">
            <Button
              onClick={handleClick}
              className="bg-[#87E87F] text-black hover:bg-[#87E87F] hover:text-black"
            >
              Plan My Trip
            </Button>
          </li>
          {/* <li className="font-bold ">
            <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}><SunMoon /></Button>
          </li> */}
        </ul>
      </nav>
    </>
  );
}
