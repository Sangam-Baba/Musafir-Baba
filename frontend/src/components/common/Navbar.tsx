import Link from "next/link";
import { Palmtree, Car, FileText, BookOpen } from "lucide-react";

export function Navbar({ onClose }: { onClose?: () => void }) {
  return (
    <>
      <nav className="flex lg:items-center">
        <ul className="flex flex-col md:flex-row lg:items-center md:gap-3 gap-6 lg:gap-8">
          <li className="font-semibold  text-black group">
            <Link onClick={onClose} href="/holidays" className="flex items-center gap-1.5">
              <Palmtree className="w-4 h-4 text-[#FE5300]" />
              Holiday Packages
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          {/* <li className="font-semibold group text-black whitespace-nowrap">
            <Link onClick={onClose} href="/holidays/honeymoon-packages">
              Honeymoon Trips
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold  group text-black whitespace-nowrap">
            <Link
              onClick={onClose}
              href="/holidays/international-tour-packages"
            >
              International Trips
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li> */}
          <li className="font-semibold group  text-black">
            <Link onClick={onClose} href="/rental" className="flex items-center gap-1.5">
              <Car className="w-4 h-4 text-[#FE5300]" />
              Car Rental
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          <li className="font-semibold group  text-black">
            <Link onClick={onClose} href="/visa" className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#FE5300]" />
              Visa
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
          {/* <li className="font-semibold group  text-black">
            <Link onClick={onClose} href="/membership">
              Membership
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li> */}
          <li className="font-semibold group  text-black">
            <Link onClick={onClose} href="/blog" className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-[#FE5300]" />
              Blog
            </Link>
            <p className="rounded-xl h-0.5 bg-[#FE5300] opacity-0 group-hover:opacity-100 transition-all duration-300"></p>
          </li>
        </ul>
      </nav>
    </>
  );
}
