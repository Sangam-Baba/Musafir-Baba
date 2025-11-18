"use client";

import * as React from "react";

import Link from "next/link";

export function Navbar() {
  return (
    <>
      <nav className="flex lg:items-center">
        <ul className="flex flex-col md:flex-row lg:items-center gap-6 lg:gap-8">
          <li className="font-semibold  text-black group">
            <Link href="/holidays">Holidays</Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold group text-black">
            <Link href="/holidays/honeymoon-package">Honeymoon Trips</Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold  group text-black">
            <Link href="/holidays/international-tour-packages">
              International Trips
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold group  text-black">
            <Link href="/visa">Visa</Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold group  text-black">
            <Link href="/membership">Membership</Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold group  text-black">
            <Link href="/news">News</Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          {/* <li className="font-semi-bold  text-[#FE5300]">
            <Button
              onClick={handleClick}
              className="bg-[#87E87F] text-black hover:bg-[#87E87F] hover:text-black"
            >
              Plan My Trip
            </Button>
          </li> */}
          {/* <li className="font-bold ">
            <Button onClick={() => setTheme(theme === "light" ? "dark" : "light")}><SunMoon /></Button>
          </li> */}
        </ul>
      </nav>
    </>
  );
}
