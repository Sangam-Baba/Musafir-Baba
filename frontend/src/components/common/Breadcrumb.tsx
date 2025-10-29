"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

export default function Breadcrumb() {
  const pathname = usePathname();
  const pathSegments = pathname.split("/").filter(Boolean);

  const breadcrumbs = pathSegments.map((segment, index) => {
    const href = "/" + pathSegments.slice(0, index + 1).join("/");
    const name =
      segment.split("-").join(" ").charAt(0).toUpperCase() +
      segment.split("-").join(" ").slice(1);
    return { name, href };
  });

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-600 my-2">
      <ol className="flex items-center flex-wrap">
        <li>
          <Link
            href="/"
            className="text-gray-800 hover:text-blue-600 cursor-pointer text-md  hover:underline"
          >
            Home
          </Link>
        </li>

        {breadcrumbs.map((bc, i) => (
          <li key={bc.href} className="flex items-center">
            <ChevronRightIcon size={13} color="#FE5300" />
            {i === breadcrumbs.length - 1 ? (
              <span className="text-gray-800 text-md ">{bc.name} </span>
            ) : (
              <Link
                href={bc.href}
                className="text-gray-800 hover:text-blue-600 cursor-pointer text-md  hover:underline"
              >
                {bc.name}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
