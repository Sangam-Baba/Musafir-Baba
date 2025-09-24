"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export default function GTMProvider() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;

    (window as any).dataLayer = (window as any).dataLayer || [];
    (window as any).dataLayer.push({
      event: "pageview",
      page: pathname,
    });
  }, [pathname]);

  return null;
}
