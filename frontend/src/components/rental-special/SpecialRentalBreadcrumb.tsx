import Link from "next/link";
import { Car, ChevronRightIcon, FileText, House, Tag, type LucideIcon } from "lucide-react";

// Breadcrumb of the special rental pages: Home › Rental › {special type} ›
// {page}. Own component because the shared <Breadcrumb> guesses each crumb
// from the URL (for /rental it assumes the second segment is a city). Same
// look as the shared one.

const iconClass = "w-3.5 h-3.5 md:w-4 md:h-4 shrink-0";

interface Crumb {
  label: string;
  href?: string;
  Icon: LucideIcon;
}

export default function SpecialRentalBreadcrumb({
  typeName,
  typeHref,
  pageTitle,
}: {
  typeName: string;
  typeHref?: string; // landing page URL when it exists and this is a detail page
  pageTitle?: string; // detail pages only
}) {
  const crumbs: Crumb[] = [
    { label: "Home", href: "/", Icon: House },
    { label: "Rental", href: "/rental", Icon: Car },
    { label: typeName, href: pageTitle ? typeHref : undefined, Icon: Tag },
    ...(pageTitle ? [{ label: pageTitle, Icon: FileText }] : []),
  ];

  return (
    <nav aria-label="Breadcrumb" className="text-[13px] md:text-sm text-gray-600 my-2 z-10">
      <ol className="flex flex-wrap items-center gap-y-0.5">
        {crumbs.map(({ label, href, Icon }, i) => (
          <li key={`${label}-${i}`} className="flex items-center min-w-0">
            {href ? (
              <Link
                href={href}
                className="inline-flex items-center gap-0.5 md:gap-1 text-gray-800 hover:text-blue-600 hover:underline"
              >
                <Icon className={iconClass} aria-hidden="true" />
                {label}
              </Link>
            ) : (
              <span
                className="inline-flex items-center gap-0.5 md:gap-1 text-gray-800 min-w-0"
                aria-current={i === crumbs.length - 1 ? "page" : undefined}
              >
                <Icon className={iconClass} aria-hidden="true" />
                <span className="truncate">{label}</span>
              </span>
            )}
            {i < crumbs.length - 1 && (
              <ChevronRightIcon size={16} color="#FE5300" className="mx-0.5 md:mx-1 w-3.5 h-3.5 md:w-4 md:h-4 shrink-0" />
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
