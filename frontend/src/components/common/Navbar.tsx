"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navbar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  const navLinks = [
    { name: "Holiday packages", href: "/holidays" },
    { name: "Car rental", href: "/rental" },
    { name: "Visa", href: "/visa" },
    { name: "Blog", href: "/blog" },
  ];

  return (
    <nav className="flex lg:items-center w-full">
      <ul className="flex flex-col md:flex-row lg:items-center md:gap-6 gap-6 lg:gap-8 w-full justify-center">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname?.startsWith(`${link.href}/`);
          return (
            <li key={link.name} className="relative font-medium text-[15px] text-gray-800 hover:text-[#FE5300] transition-colors py-2 md:py-3">
              <Link onClick={onClose} href={link.href} className="flex items-center">
                {link.name}
              </Link>
              {/* Active / Hover Bottom Border */}
              <div 
                className={`absolute bottom-0 left-0 w-full h-[3px] bg-[#FE5300] rounded-t-sm transition-all duration-300 ${
                  isActive ? "opacity-100" : "opacity-0 hover:opacity-100"
                }`}
              />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
