"use client"

import * as React from "react";
import { useTheme } from "next-themes";
import { SunMoon } from 'lucide-react';
import { Button } from "../ui/button"
import Link from "next/link";

export function Navbar() {
  const { theme, setTheme }= useTheme();
  return (
    <>
      <nav className="flex lg:items-center">
        <ul className="flex flex-col md:flex-row lg:items-center md:gap-3 lg:gap-6">
          <li  className="font-bold ">
            <Link href="/packages">Packages</Link>
          </li>
          <li className="font-bold ">
            <Link href="#">Ticket Booking</Link>
          </li>
          <li className="font-bold ">
            <Link href="#">Visa</Link>
          </li>
          <li className="font-bold ">
            <Link href="#">Become A Member</Link>
          </li>
          <li className="font-bold ">
           <Link href="/blog">Blogs</Link>
          </li>
          <li className="font-bold ">
            <Button className="bg-[#FE5300]">Pay Now</Button>
          </li>
          <li className="font-bold ">
            <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}><SunMoon /></Button>
          </li>
        </ul>
 
      </nav>
    </>

    
  )
}


