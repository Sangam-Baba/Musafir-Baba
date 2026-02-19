"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRightIcon } from "lucide-react";

export default function Breadcrumb({ title }: { title?: string }) {
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
    <nav aria-label="Breadcrumb" className="text-sm text-gray-600 my-2 z-10">
      <ol className="flex flex-wrap items-center">
        <li className="flex items-center">
          <Link
            href="/"
            className="text-gray-800 hover:text-blue-600 text-md hover:underline"
          >
            Home
          </Link>

          {breadcrumbs.length > 0 && (
            <ChevronRightIcon
              size={16}
              color="#FE5300"
              className="mx-1 shrink-0"
            />
          )}
        </li>

        {breadcrumbs.map((bc, i) => {
          const isLast = i === breadcrumbs.length - 1;

          return (
            <li key={`${bc.href}-${i}`} className="flex items-center">
              {isLast ? (
                <span className="text-gray-800 text-md">
                  {title ?? bc.name}
                </span>
              ) : (
                <>
                  <Link
                    href={bc.href}
                    className="text-gray-800 hover:text-blue-600 text-md hover:underline z-10"
                  >
                    {bc.name}
                  </Link>

                  <ChevronRightIcon
                    size={16}
                    color="#FE5300"
                    className="mx-1 shrink-0"
                  />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
